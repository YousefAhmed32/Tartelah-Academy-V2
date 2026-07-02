import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useInitAuth } from './hooks/useAuth.js'
import { useAuthStore } from './store/authStore.js'
import { ROUTES } from './config/constants.js'
import LoadingPage from './components/shared/LoadingPage.jsx'

// Layouts
import PublicLayout from './layouts/PublicLayout.jsx'
import AuthLayout from './layouts/AuthLayout.jsx'
import StudentLayout from './layouts/StudentLayout.jsx'
import TeacherLayout from './layouts/TeacherLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'

// Lazy pages — Marketing
const HomePage = lazy(() => import('./pages/marketing/HomePage.jsx'))
const AboutPage = lazy(() => import('./pages/marketing/AboutPage.jsx'))
const ProgramsPage = lazy(() => import('./pages/marketing/ProgramsPage.jsx'))
const TeachersPage = lazy(() => import('./pages/marketing/TeachersPage.jsx'))
const PricingPage = lazy(() => import('./pages/marketing/PricingPage.jsx'))
const FAQPage = lazy(() => import('./pages/marketing/FAQPage.jsx'))
const ContactPage = lazy(() => import('./pages/marketing/ContactPage.jsx'))

// Auth
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage.jsx'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.jsx'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage.jsx'))

// Student
const StudentDashboardPage = lazy(() => import('./pages/student/StudentDashboardPage.jsx'))
const StudentSchedulePage = lazy(() => import('./pages/student/StudentSchedulePage.jsx'))
const StudentSessionsPage = lazy(() => import('./pages/student/StudentSessionsPage.jsx'))
const StudentHomeworkPage = lazy(() => import('./pages/student/StudentHomeworkPage.jsx'))
const StudentEvaluationsPage = lazy(() => import('./pages/student/StudentEvaluationsPage.jsx'))
const StudentProgressPage = lazy(() => import('./pages/student/StudentProgressPage.jsx'))
const StudentAcademicPage = lazy(() => import('./pages/student/StudentAcademicPage.jsx'))
const StudentSubscriptionPage = lazy(() => import('./pages/student/StudentSubscriptionPage.jsx'))
const StudentEnrollmentPage = lazy(() => import('./pages/student/StudentEnrollmentPage.jsx'))
const StudentNotificationsPage = lazy(() => import('./pages/student/StudentNotificationsPage.jsx'))
const StudentSettingsPage = lazy(() => import('./pages/student/StudentSettingsPage.jsx'))

// Teacher
const TeacherDashboardPage = lazy(() => import('./pages/teacher/TeacherDashboardPage.jsx'))
const TeacherStudentsPage = lazy(() => import('./pages/teacher/TeacherStudentsPage.jsx'))
const TeacherSessionsPage = lazy(() => import('./pages/teacher/TeacherSessionsPage.jsx'))
const TeacherAttendancePage = lazy(() => import('./pages/teacher/TeacherAttendancePage.jsx'))
const TeacherEvaluationsPage = lazy(() => import('./pages/teacher/TeacherEvaluationsPage.jsx'))
const TeacherHomeworkPage = lazy(() => import('./pages/teacher/TeacherHomeworkPage.jsx'))
const TeacherProgressPage = lazy(() => import('./pages/teacher/TeacherProgressPage.jsx'))
const TeacherLinksPage = lazy(() => import('./pages/teacher/TeacherLinksPage.jsx'))
const TeacherPerformancePage = lazy(() => import('./pages/teacher/TeacherPerformancePage.jsx'))
const TeacherNotificationsPage = lazy(() => import('./pages/teacher/TeacherNotificationsPage.jsx'))
const TeacherSettingsPage = lazy(() => import('./pages/teacher/TeacherSettingsPage.jsx'))

// Admin
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'))
const AdminStudentsPage = lazy(() => import('./pages/admin/AdminStudentsPage.jsx'))
const AdminStudentDetailPage = lazy(() => import('./pages/admin/AdminStudentDetailPage.jsx'))
const AdminTeachersPage = lazy(() => import('./pages/admin/AdminTeachersPage.jsx'))
const AdminCoursesPage = lazy(() => import('./pages/admin/AdminCoursesPage.jsx'))
const AdminSessionsPage = lazy(() => import('./pages/admin/AdminSessionsPage.jsx'))
const AdminScheduleRulesPage = lazy(() => import('./pages/admin/AdminScheduleRulesPage.jsx'))
const AdminPackagesPage = lazy(() => import('./pages/admin/AdminPackagesPage.jsx'))
const AdminSubscriptionsPage = lazy(() => import('./pages/admin/AdminSubscriptionsPage.jsx'))
const AdminEnrollmentsPage = lazy(() => import('./pages/admin/AdminEnrollmentsPage.jsx'))
const AdminWebsitePage = lazy(() => import('./pages/admin/AdminWebsitePage.jsx'))
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage.jsx'))
const AdminNotificationsPage = lazy(() => import('./pages/admin/AdminNotificationsPage.jsx'))
const AdminAuditLogsPage = lazy(() => import('./pages/admin/AdminAuditLogsPage.jsx'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage.jsx'))

// Courses (public)
const CoursesPage = lazy(() => import('./pages/marketing/CoursesPage.jsx'))
const CourseDetailPage = lazy(() => import('./pages/marketing/CourseDetailPage.jsx'))

// Courses (admin)
const AdminCourseFormPage = lazy(() => import('./pages/admin/AdminCourseFormPage.jsx'))

// Articles
const ArticlesPage = lazy(() => import('./pages/marketing/ArticlesPage.jsx'))
const ArticleDetailPage = lazy(() => import('./pages/marketing/ArticleDetailPage.jsx'))
const AdminArticlesPage = lazy(() => import('./pages/admin/AdminArticlesPage.jsx'))
const AdminArticleEditorPage = lazy(() => import('./pages/admin/AdminArticleEditorPage.jsx'))

// Contact Messages
const AdminContactPage = lazy(() => import('./pages/admin/AdminContactPage.jsx'))

// Success Stories
const AdminSuccessStoriesPage = lazy(() => import('./pages/admin/AdminSuccessStoriesPage.jsx'))

// Teacher Performance
const AdminTeacherPerformancePage = lazy(() => import('./pages/admin/AdminTeacherPerformancePage.jsx'))

// AI
const AIAssistantPage = lazy(() => import('./pages/ai/AIAssistantPage.jsx'))

function RootRedirect() {
  const { isAuthenticated, getDashboardPath } = useAuthStore()
  if (isAuthenticated) return <Navigate to={getDashboardPath()} replace />
  return <Navigate to={ROUTES.HOME} replace />
}

export default function App() {
  useInitAuth()
  const { isLoading } = useAuthStore()

  if (isLoading) return <LoadingPage dark />

  return (
    <Suspense fallback={<LoadingPage dark />}>
      <Routes>
        {/* Marketing */}
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.HOME} element={<HomePage />} />
          <Route path={ROUTES.ABOUT} element={<AboutPage />} />
          <Route path={ROUTES.PROGRAMS} element={<ProgramsPage />} />
          <Route path={ROUTES.TEACHERS} element={<TeachersPage />} />
          <Route path={ROUTES.PRICING} element={<PricingPage />} />
          <Route path={ROUTES.FAQ} element={<FAQPage />} />
          <Route path={ROUTES.CONTACT} element={<ContactPage />} />
          <Route path={ROUTES.COURSES} element={<CoursesPage />} />
          <Route path={ROUTES.COURSE_DETAIL} element={<CourseDetailPage />} />
          <Route path={ROUTES.ARTICLES} element={<ArticlesPage />} />
          <Route path={ROUTES.ARTICLE_DETAIL} element={<ArticleDetailPage />} />
        </Route>

        {/* Auth */}
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
        </Route>

        {/* Student */}
        <Route element={<StudentLayout />}>
          <Route path={ROUTES.STUDENT_DASHBOARD} element={<StudentDashboardPage />} />
          <Route path={ROUTES.STUDENT_SCHEDULE} element={<StudentSchedulePage />} />
          <Route path={ROUTES.STUDENT_SESSIONS} element={<StudentSessionsPage />} />
          <Route path={ROUTES.STUDENT_HOMEWORK} element={<StudentHomeworkPage />} />
          <Route path={ROUTES.STUDENT_EVALUATIONS} element={<StudentEvaluationsPage />} />
          <Route path={ROUTES.STUDENT_PROGRESS} element={<StudentProgressPage />} />
          <Route path={ROUTES.STUDENT_ACADEMIC} element={<StudentAcademicPage />} />
          <Route path={ROUTES.STUDENT_SUBSCRIPTION} element={<StudentSubscriptionPage />} />
          <Route path={ROUTES.STUDENT_ENROLLMENT} element={<StudentEnrollmentPage />} />
          <Route path={ROUTES.STUDENT_NOTIFICATIONS} element={<StudentNotificationsPage />} />
          <Route path={ROUTES.STUDENT_SETTINGS} element={<StudentSettingsPage />} />
        </Route>

        {/* Teacher */}
        <Route element={<TeacherLayout />}>
          <Route path={ROUTES.TEACHER_DASHBOARD} element={<TeacherDashboardPage />} />
          <Route path={ROUTES.TEACHER_STUDENTS} element={<TeacherStudentsPage />} />
          <Route path={ROUTES.TEACHER_SESSIONS} element={<TeacherSessionsPage />} />
          <Route path={ROUTES.TEACHER_ATTENDANCE} element={<TeacherAttendancePage />} />
          <Route path={ROUTES.TEACHER_EVALUATIONS} element={<TeacherEvaluationsPage />} />
          <Route path={ROUTES.TEACHER_HOMEWORK} element={<TeacherHomeworkPage />} />
          <Route path={ROUTES.TEACHER_PROGRESS} element={<TeacherProgressPage />} />
          <Route path={ROUTES.TEACHER_LINKS} element={<TeacherLinksPage />} />
          <Route path={ROUTES.TEACHER_PERFORMANCE} element={<TeacherPerformancePage />} />
          <Route path={ROUTES.TEACHER_NOTIFICATIONS} element={<TeacherNotificationsPage />} />
          <Route path={ROUTES.TEACHER_SETTINGS} element={<TeacherSettingsPage />} />
        </Route>

        {/* Admin */}
        <Route element={<AdminLayout />}>
          <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
          <Route path={ROUTES.ADMIN_STUDENTS} element={<AdminStudentsPage />} />
          <Route path={ROUTES.ADMIN_STUDENT_DETAIL} element={<AdminStudentDetailPage />} />
          <Route path={ROUTES.ADMIN_TEACHERS} element={<AdminTeachersPage />} />
          <Route path={ROUTES.ADMIN_COURSES} element={<AdminCoursesPage />} />
          <Route path={ROUTES.ADMIN_COURSE_NEW} element={<AdminCourseFormPage />} />
          <Route path={ROUTES.ADMIN_COURSE_EDIT} element={<AdminCourseFormPage />} />
          <Route path={ROUTES.ADMIN_SESSIONS} element={<AdminSessionsPage />} />
          <Route path={ROUTES.ADMIN_SCHEDULE_RULES} element={<AdminScheduleRulesPage />} />
          <Route path={ROUTES.ADMIN_PACKAGES} element={<AdminPackagesPage />} />
          <Route path={ROUTES.ADMIN_SUBSCRIPTIONS} element={<AdminSubscriptionsPage />} />
          <Route path={ROUTES.ADMIN_ENROLLMENTS} element={<AdminEnrollmentsPage />} />
          <Route path={ROUTES.ADMIN_WEBSITE} element={<AdminWebsitePage />} />
          <Route path={ROUTES.ADMIN_REPORTS} element={<AdminReportsPage />} />
          <Route path={ROUTES.ADMIN_NOTIFICATIONS} element={<AdminNotificationsPage />} />
          <Route path={ROUTES.ADMIN_AUDIT_LOGS} element={<AdminAuditLogsPage />} />
          <Route path={ROUTES.ADMIN_SETTINGS} element={<AdminSettingsPage />} />
          <Route path={ROUTES.ADMIN_ARTICLES} element={<AdminArticlesPage />} />
          <Route path={ROUTES.ADMIN_ARTICLE_NEW} element={<AdminArticleEditorPage />} />
          <Route path={ROUTES.ADMIN_ARTICLE_EDIT} element={<AdminArticleEditorPage />} />
          <Route path={ROUTES.ADMIN_CONTACT_MESSAGES} element={<AdminContactPage />} />
          <Route path={ROUTES.ADMIN_SUCCESS_STORIES} element={<AdminSuccessStoriesPage />} />
          <Route path={ROUTES.ADMIN_TEACHER_PERFORMANCE} element={<AdminTeacherPerformancePage />} />
        </Route>

        {/* AI */}
        <Route path={ROUTES.AI_ASSISTANT} element={<AIAssistantPage />} />

        {/* Fallback */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  )
}
