-- Researcher isolation + login-free participant access.
-- Researchers use auth.uid() (RLS). Participants never authenticate;
-- they only call SECURITY DEFINER RPCs with study + participant code.

-- Remove world-readable survey/response policies from the foundation schema.
drop policy if exists "Public can read surveys for participation" on public.surveys;
drop policy if exists "Public can read survey_items for participation" on public.survey_items;
drop policy if exists "Public can read prompt_occasions for participation" on public.prompt_occasions;
drop policy if exists "Public can read prompts for participation" on public.prompts;
drop policy if exists "Active participants can write responses" on public.responses;
drop policy if exists "Active participants can update own responses" on public.responses;

create or replace function public.participant_start_session(
  p_code text,
  p_study_id uuid default null,
  p_occasion_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_code));
  v_participant public.participants%rowtype;
  v_study public.studies%rowtype;
  v_survey public.surveys%rowtype;
  v_prompt public.prompts%rowtype;
  v_occasion public.prompt_occasions%rowtype;
  v_items jsonb;
  v_match_count integer;
begin
  if v_code is null or v_code = '' then
    return null;
  end if;

  if p_study_id is not null then
    select * into v_participant
    from public.participants
    where study_id = p_study_id
      and participant_code = v_code
      and active = true
    limit 1;
  else
    select count(*) into v_match_count
    from public.participants
    where participant_code = v_code and active = true;

    if v_match_count > 1 then
      raise exception 'AMBIGUOUS_PARTICIPANT_CODE';
    end if;

    select * into v_participant
    from public.participants
    where participant_code = v_code and active = true
    limit 1;
  end if;

  if v_participant.id is null then
    return null;
  end if;

  select * into v_study from public.studies where id = v_participant.study_id;
  if v_study.id is null then
    return null;
  end if;

  if p_occasion_id is not null then
    select * into v_occasion from public.prompt_occasions where id = p_occasion_id;
    if v_occasion.id is null then
      return null;
    end if;
    select * into v_prompt from public.prompts where id = v_occasion.prompt_id;
    if v_prompt.id is null then
      return null;
    end if;
    select * into v_survey from public.surveys where id = v_prompt.survey_id;
    if v_survey.id is null or v_survey.study_id <> v_study.id then
      return null;
    end if;
  else
    select * into v_survey
    from public.surveys
    where study_id = v_study.id
    order by created_at
    limit 1;
    if v_survey.id is null then
      return null;
    end if;

    select * into v_prompt
    from public.prompts
    where survey_id = v_survey.id and active = true
    order by created_at
    limit 1;
    if v_prompt.id is null then
      return null;
    end if;

    select * into v_occasion
    from public.prompt_occasions
    where prompt_id = v_prompt.id
    order by
      case
        when scheduled_for is not null
             and scheduled_for::date = current_date then 0
        else 1
      end,
      occasion_index
    limit 1;
    if v_occasion.id is null then
      return null;
    end if;
  end if;

  select coalesce(jsonb_agg(to_jsonb(si) order by si.display_order), '[]'::jsonb)
    into v_items
  from public.survey_items si
  where si.survey_id = v_survey.id;

  return jsonb_build_object(
    'study', to_jsonb(v_study),
    'participant', to_jsonb(v_participant),
    'survey', to_jsonb(v_survey),
    'items', v_items,
    'prompt', to_jsonb(v_prompt),
    'occasion', to_jsonb(v_occasion)
  );
end;
$$;

create or replace function public.participant_list_responses(
  p_participant_id uuid,
  p_occasion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
  v_rows jsonb;
begin
  select exists (
    select 1
    from public.participants p
    join public.prompt_occasions po on po.id = p_occasion_id
    join public.prompts pr on pr.id = po.prompt_id
    join public.surveys s on s.id = pr.survey_id
    where p.id = p_participant_id
      and p.active = true
      and s.study_id = p.study_id
  ) into v_ok;

  if not v_ok then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
    into v_rows
  from public.responses r
  where r.participant_id = p_participant_id
    and r.prompt_occasion_id = p_occasion_id;

  return v_rows;
end;
$$;

create or replace function public.participant_save_response(
  p_participant_id uuid,
  p_survey_item_id uuid,
  p_prompt_occasion_id uuid,
  p_numeric_value numeric default null,
  p_text_value text default null,
  p_selected_values jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
  v_row public.responses%rowtype;
begin
  select exists (
    select 1
    from public.participants p
    join public.survey_items si on si.id = p_survey_item_id
    join public.surveys s on s.id = si.survey_id
    join public.prompt_occasions po on po.id = p_prompt_occasion_id
    join public.prompts pr on pr.id = po.prompt_id
    where p.id = p_participant_id
      and p.active = true
      and s.study_id = p.study_id
      and pr.survey_id = s.id
  ) into v_ok;

  if not v_ok then
    raise exception 'PARTICIPANT_WRITE_DENIED';
  end if;

  insert into public.responses (
    participant_id,
    survey_item_id,
    prompt_occasion_id,
    numeric_value,
    text_value,
    selected_values,
    answered_at,
    updated_at
  )
  values (
    p_participant_id,
    p_survey_item_id,
    p_prompt_occasion_id,
    p_numeric_value,
    p_text_value,
    p_selected_values,
    now(),
    now()
  )
  on conflict (participant_id, survey_item_id, prompt_occasion_id)
  do update set
    numeric_value = excluded.numeric_value,
    text_value = excluded.text_value,
    selected_values = excluded.selected_values,
    answered_at = excluded.answered_at,
    updated_at = excluded.updated_at
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.participant_start_session(text, uuid, uuid) from public;
revoke all on function public.participant_list_responses(uuid, uuid) from public;
revoke all on function public.participant_save_response(uuid, uuid, uuid, numeric, text, jsonb) from public;

grant execute on function public.participant_start_session(text, uuid, uuid) to anon, authenticated;
grant execute on function public.participant_list_responses(uuid, uuid) to anon, authenticated;
grant execute on function public.participant_save_response(uuid, uuid, uuid, numeric, text, jsonb) to anon, authenticated;
