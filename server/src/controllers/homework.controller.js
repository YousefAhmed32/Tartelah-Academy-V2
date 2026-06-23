const Homework = require('../models/Homework')
const Notification = require('../models/Notification')
const { sendSuccess, sendError } = require('../utils/response')

exports.create = async (req, res, next) => {
  try {
    const { titleAr, descriptionAr, dueDate, assignedTo, courseId } = req.body
    const hw = await Homework.create({ teacherId: req.user._id, titleAr, descriptionAr, dueDate, assignedTo, courseId })
    if (assignedTo?.length) {
      await Notification.insertMany(assignedTo.map(sid => ({
        userId: sid, titleAr: 'واجب جديد', bodyAr: `تم تعيين واجب: "${titleAr}"`, type: 'homework', data: { homeworkId: hw._id }
      })))
    }
    sendSuccess(res, hw, 'تم إنشاء الواجب', 201)
  } catch (err) {
    next(err)
  }
}

exports.getStudentHomework = async (req, res, next) => {
  try {
    const now = new Date()
    const hws = await Homework.find({ assignedTo: req.user._id }).sort({ dueDate: 1 })
    const result = hws.map(hw => {
      const mySubmission = hw.submissions?.find(s => s.studentId?.toString() === req.user._id.toString())
      let status = 'active'
      if (mySubmission) status = 'completed'
      else if (new Date(hw.dueDate) < now) status = 'overdue'
      return { ...hw.toObject(), status, mySubmission }
    })
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

exports.getTeacherHomework = async (req, res, next) => {
  try {
    const hws = await Homework.find({ teacherId: req.user._id }).sort({ createdAt: -1 })
    sendSuccess(res, hws)
  } catch (err) {
    next(err)
  }
}

exports.submit = async (req, res, next) => {
  try {
    const hw = await Homework.findById(req.params.id)
    if (!hw) return sendError(res, 'الواجب غير موجود', 404)
    if (!hw.assignedTo?.some(id => id.toString() === req.user._id.toString())) {
      return sendError(res, 'غير مصرح لك بتسليم هذا الواجب', 403)
    }
    const alreadySubmitted = hw.submissions?.some(s => s.studentId?.toString() === req.user._id.toString())
    if (alreadySubmitted) return sendError(res, 'لقد سلّمت هذا الواجب مسبقاً', 400)
    hw.submissions.push({ studentId: req.user._id, content: req.body.content })
    await hw.save()
    await Notification.create({ userId: hw.teacherId, titleAr: 'تسليم واجب', bodyAr: `قام طالب بتسليم "${hw.titleAr}"`, type: 'homework' })
    sendSuccess(res, { submitted: true }, 'تم تسليم الواجب')
  } catch (err) {
    next(err)
  }
}
