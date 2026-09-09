import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LocaleProvider } from './context/LocaleContext'
import { HomePage } from './pages/HomePage'
import { FlowSlide } from './pages/FlowSlide'
import { ParticipantEntryPage } from './pages/participant/ParticipantEntryPage'
import { SurveyCompletePage } from './pages/participant/SurveyCompletePage'
import { SurveyTakePage } from './pages/participant/SurveyTakePage'
import { ResearcherLayout } from './pages/researcher/ResearcherLayout'
import { ResponsesPage } from './pages/researcher/ResponsesPage'
import { StudiesPage } from './pages/researcher/StudiesPage'
import { StudyDetailPage } from './pages/researcher/StudyDetailPage'
import { SurveyEditorPage } from './pages/researcher/SurveyEditorPage'

export default function App() {
  return (
    <LocaleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/flow-slide" element={<FlowSlide />} />

          {/* Participant — mobile-first survey taking */}
          <Route path="/p" element={<ParticipantEntryPage />} />
          <Route path="/take/:code" element={<SurveyTakePage />} />
          <Route path="/take/:code/done" element={<SurveyCompletePage />} />

          {/* Researcher — study / survey / response management */}
          <Route path="/researcher" element={<ResearcherLayout />}>
            <Route index element={<StudiesPage />} />
            <Route path="studies/:studyId" element={<StudyDetailPage />} />
            <Route path="studies/:studyId/responses" element={<ResponsesPage />} />
            <Route path="surveys/:surveyId" element={<SurveyEditorPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LocaleProvider>
  )
}
