import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LocaleProvider } from './context/LocaleContext'
import { HomePage } from './pages/HomePage'
import { FlowSlide } from './pages/FlowSlide'
import { ParticipantEntryPage } from './pages/participant/ParticipantEntryPage'
import { SurveyCompletePage } from './pages/participant/SurveyCompletePage'
import { SurveyTakePage } from './pages/participant/SurveyTakePage'
import { ResearcherAuthGate } from './pages/researcher/ResearcherAuthGate'
import { ResearcherLayout } from './pages/researcher/ResearcherLayout'
import { ResponsesPage } from './pages/researcher/ResponsesPage'
import { StudiesPage } from './pages/researcher/StudiesPage'
import { StudyDetailPage } from './pages/researcher/StudyDetailPage'
import { SurveyEditorPage } from './pages/researcher/SurveyEditorPage'

const routerBasename = (() => {
  const base = import.meta.env.BASE_URL
  if (!base || base === '/') return undefined
  return base.replace(/\/$/, '')
})()

export default function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <BrowserRouter basename={routerBasename}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/flow-slide" element={<FlowSlide />} />

            {/* Participant — no login; identified only by invitation code */}
            <Route path="/p" element={<ParticipantEntryPage />} />
            <Route path="/take/:code" element={<SurveyTakePage />} />
            <Route path="/take/:code/done" element={<SurveyCompletePage />} />

            {/* Researcher — sign-in required; each account sees only its studies */}
            <Route path="/researcher" element={<ResearcherAuthGate />}>
              <Route element={<ResearcherLayout />}>
                <Route index element={<StudiesPage />} />
                <Route path="studies/:studyId" element={<StudyDetailPage />} />
                <Route path="studies/:studyId/responses" element={<ResponsesPage />} />
                <Route path="surveys/:surveyId" element={<SurveyEditorPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LocaleProvider>
  )
}
