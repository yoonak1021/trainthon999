export type ResponseOption = {
  id: string
  label: string
  value: number
}

export type ScaleItem = {
  id: string
  number: number
  text: string
  reverseScored: boolean
}

export type ScaleDefinition = {
  id: string
  name: string
  shortName: string
  fullName: string
  constructs: string[]
  aliases: string[]
  instructions: string
  citation: string
  responseOptions: ResponseOption[]
  items: ScaleItem[]
}

export type EditableItem = {
  id: string
  number: number
  text: string
  reverseScored: boolean
}

export type EditableScale = {
  instanceId: string
  sourceId: string
  name: string
  shortName: string
  instructions: string
  citation: string
  responseOptions: ResponseOption[]
  items: EditableItem[]
}
