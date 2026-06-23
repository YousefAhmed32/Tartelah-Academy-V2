function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول إلى هذا المورد' })
    }
    next()
  }
}

const isAdmin = authorize('admin')
const isTeacher = authorize('admin', 'teacher')
const isStudent = authorize('student')
const isAdminOrTeacher = authorize('admin', 'teacher')

module.exports = { authorize, isAdmin, isTeacher, isStudent, isAdminOrTeacher }
