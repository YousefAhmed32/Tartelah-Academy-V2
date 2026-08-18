import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Search, ShieldCheck, KeyRound, UserCog, Ban, CheckCircle2, Copy, Crown, Clock,
} from 'lucide-react'
import { teamService } from '../../services/team.service.js'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx'
import Can from '../../components/shared/Can.jsx'
import { useAuthStore } from '../../store/authStore.js'
import { ROLES, ROLE_DISPLAY_NAMES, ADMIN_FAMILY_ROLES, PERMISSION_GROUPS } from '../../config/constants.js'
import { formatDateAr } from '../../utils/date.js'

const PERMISSION_LABELS = {
  'users.view': 'عرض الحسابات',
  'users.create': 'إنشاء حسابات (معلمين/طلاب)',
  'users.update': 'تعديل بيانات الحسابات',
  'users.disable': 'إيقاف / تفعيل الحسابات',
  'users.delete': 'حذف الحسابات',
  'users.reset_password': 'إعادة تعيين كلمات المرور',
  'admins.create': 'إنشاء حسابات إدارية',
  'admins.update': 'تعديل الأدوار الإدارية',
  'admins.disable': 'إيقاف الحسابات الإدارية',
  'permissions.view': 'عرض الصلاحيات',
  'permissions.assign': 'منح / سحب الصلاحيات',
  'roles.view': 'عرض الأدوار',
  'roles.create': 'إنشاء أدوار',
  'roles.update': 'تعديل الأدوار',
  'roles.delete': 'حذف الأدوار',
  'dashboard.view': 'الوصول للوحة التحكم',
  'content.create': 'إنشاء محتوى',
  'content.update': 'تعديل المحتوى',
  'content.delete': 'حذف المحتوى',
  'content.publish': 'نشر المحتوى',
  'content.schedule': 'جدولة المحتوى',
  'settings.view': 'عرض الإعدادات',
  'settings.update': 'تعديل الإعدادات',
  'content.view': 'عرض المحتوى',
  'students.view': 'عرض الطلاب',
  'students.manage': 'إدارة الطلاب (تعديل / حذف / إعادة تعيين كلمة المرور)',
  'teachers.view': 'عرض المعلمين',
  'teachers.manage': 'إدارة المعلمين (إنشاء / تعديل / إعادة تعيين كلمة المرور)',
  'courses.view': 'عرض المقررات والمستويات',
  'courses.manage': 'إدارة المقررات والمستويات',
  'packages.view': 'عرض الباقات والأسعار',
  'packages.manage': 'إدارة الباقات والأسعار',
  'sessions.view': 'عرض الحصص',
  'sessions.manage': 'إدارة الحصص والتقييمات والحضور',
  'scheduleRules.view': 'عرض جداول الحصص',
  'scheduleRules.manage': 'إدارة جداول الحصص',
  'subscriptions.view': 'عرض الاشتراكات',
  'subscriptions.manage': 'إدارة الاشتراكات والمحفظة',
  'notifications.view': 'عرض سجل الإشعارات',
  'notifications.manage': 'إرسال إشعارات جماعية',
  'audit.view': 'عرض سجل الأنشطة',
  'reports.view': 'عرض التقارير وأداء المعلمين',
  'operations.view': 'عرض مركز العمليات',
  'enrollments.view': 'عرض طلبات التسجيل',
  'enrollments.manage': 'مراجعة طلبات التسجيل',
}

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

function RoleBadge({ role, isPrimaryAdmin }) {
  if (isPrimaryAdmin) return <Badge variant="gold"><Crown size={11} /> المسؤول الرئيسي</Badge>
  const variant = role === ROLES.ADMIN ? 'purple' : ADMIN_FAMILY_ROLES.includes(role) ? 'blue' : 'gray'
  return <Badge variant={variant}>{ROLE_DISPLAY_NAMES[role] || role}</Badge>
}

function StatusBadge({ isActive }) {
  return isActive
    ? <Badge variant="success" dot>نشط</Badge>
    : <Badge variant="danger" dot>موقوف</Badge>
}

// One-time reveal of a freshly generated/reset password — never fetchable
// again after this modal closes (see server: toPublic() never includes it).
function TempPasswordModal({ open, onClose, password }) {
  function copy() {
    navigator.clipboard?.writeText(password).then(() => toast.success('تم نسخ كلمة المرور'))
  }
  return (
    <Modal open={open} onClose={onClose} title="كلمة المرور المؤقتة" size="sm" closable={false}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          احفظ هذه الكلمة الآن — لن تظهر مرة أخرى بعد إغلاق هذه النافذة. سيُطلب من المستخدم تغييرها عند أول تسجيل دخول.
        </p>
        <div className="flex items-center gap-2">
          <code dir="ltr" className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-mono font-bold text-gray-900 text-center tracking-wider">
            {password}
          </code>
          <button onClick={copy} className="w-11 h-11 flex-none rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-100 flex items-center justify-center transition-colors">
            <Copy size={16} />
          </button>
        </div>
        <Button variant="purple" fullWidth onClick={onClose}>تم — إغلاق</Button>
      </div>
    </Modal>
  )
}

// Grouped permission selector — mirrors the actual Sidebar's information
// architecture (PERMISSION_GROUPS, shared with AdminLayout.jsx's nav-item
// tags, see config/constants.js) instead of one flat two-column wall of
// checkboxes. Every group is independently select-all-able (with a real
// indeterminate state), plus a global "صلاحيات كاملة" toggle and a live
// summary count. Grant-ceiling behavior (`canGrant`) is unchanged from the
// original flat checklist — an actor can never select a permission it
// doesn't itself hold, Primary Admin excepted.
function PermissionSelector({ allPermissions, actorPermissions, isPrimaryAdminActor, selected, onChange, disabled }) {
  const canGrant = (p) => isPrimaryAdminActor || actorPermissions.includes(p)
  const grantable = allPermissions.filter(canGrant)
  const selectedGrantable = selected.filter((p) => grantable.includes(p))
  const isFullAdmin = grantable.length > 0 && selectedGrantable.length === grantable.length

  function toggle(p) {
    if (disabled || !canGrant(p)) return
    onChange(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p])
  }
  function selectAll() {
    if (disabled) return
    onChange(Array.from(new Set([...selected, ...grantable])))
  }
  function deselectAll() {
    if (disabled) return
    onChange([])
  }
  function toggleGroup(groupPerms, groupIsFullySelected) {
    if (disabled) return
    if (groupIsFullySelected) {
      onChange(selected.filter((p) => !groupPerms.includes(p)))
    } else {
      onChange(Array.from(new Set([...selected, ...groupPerms.filter(canGrant)])))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-violet-50/70 border border-violet-100">
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" disabled={disabled} onClick={() => (isFullAdmin ? deselectAll() : selectAll())}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 ${isFullAdmin ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 border border-violet-200 hover:bg-violet-50'}`}>
            <ShieldCheck size={13} /> صلاحيات كاملة
          </button>
          <button type="button" disabled={disabled} onClick={selectAll}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
            اختيار الكل
          </button>
          <button type="button" disabled={disabled} onClick={deselectAll}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
            إلغاء الكل
          </button>
        </div>
        <span className="text-xs font-bold text-violet-700">{selectedGrantable.length} من {grantable.length} صلاحية محددة</span>
      </div>

      {PERMISSION_GROUPS.map((group) => {
        const groupPerms = group.permissions.filter((p) => allPermissions.includes(p))
        if (!groupPerms.length) return null
        const groupGrantable = groupPerms.filter(canGrant)
        const groupSelectedCount = groupPerms.filter((p) => selected.includes(p)).length
        const groupFullySelected = groupSelectedCount > 0 && groupSelectedCount === groupPerms.length
        const indeterminate = groupSelectedCount > 0 && groupSelectedCount < groupPerms.length

        return (
          <details key={group.key} open className="rounded-xl border border-gray-100 bg-gray-50/60 overflow-hidden">
            <summary className="flex items-center justify-between gap-2 px-3.5 py-2.5 cursor-pointer select-none list-none">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={groupFullySelected}
                  ref={(el) => { if (el) el.indeterminate = indeterminate }}
                  disabled={disabled || !groupGrantable.length}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleGroup(groupPerms, groupFullySelected)}
                  className="accent-violet-600 w-4 h-4"
                />
                <span className="text-sm font-bold text-gray-700">{group.label}</span>
              </div>
              <span className="text-[11px] font-semibold text-gray-400">{groupSelectedCount} / {groupPerms.length}</span>
            </summary>
            <div className="px-3.5 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {groupPerms.map((p) => {
                const g = canGrant(p)
                return (
                  <label key={p} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm transition-colors ${selected.includes(p) ? 'bg-violet-50 border-violet-200 text-violet-800' : 'bg-white border-gray-100 text-gray-600'} ${(!g || disabled) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-violet-200'}`}>
                    <input type="checkbox" checked={selected.includes(p)} disabled={disabled || !g} onChange={() => toggle(p)} className="accent-violet-600 w-4 h-4" />
                    <span className="flex-1">{PERMISSION_LABELS[p] || p}</span>
                  </label>
                )
              })}
            </div>
          </details>
        )
      })}

      {!isPrimaryAdminActor && (
        <p className="text-[11px] text-gray-400">
          الصلاحيات المعطّلة تتجاوز صلاحياتك الحالية — لا يمكنك منح ما لا تملكه.
        </p>
      )}
    </div>
  )
}

function CreateAccountModal({ open, onClose, roles, allPermissions, actor, onCreated }) {
  const initial = { firstNameAr: '', lastNameAr: '', email: '', phone: '', role: '', displayRoleName: '', jobTitle: '', password: '', notes: '', permissions: [] }
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const qc = useQueryClient()

  const roleOptions = roles.map((r) => ({ value: r.key, label: r.displayName }))

  function onRoleChange(role) {
    const meta = roles.find((r) => r.key === role)
    set('role', role)
    set('permissions', meta?.defaultPermissions?.filter((p) => actor.isPrimaryAdmin() || actor.permissions.includes(p)) || [])
  }

  const createMutation = useMutation({
    mutationFn: () => teamService.create({ ...form, permissions: form.permissions }),
    onSuccess: (res) => {
      toast.success('تم إنشاء الحساب بنجاح')
      setForm(initial)
      onClose()
      qc.invalidateQueries({ queryKey: ['admin', 'team'] })
      onCreated(res.data.data)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const isAdminFamily = ADMIN_FAMILY_ROLES.includes(form.role)
  const canSubmit = form.firstNameAr && form.lastNameAr && form.email && form.role

  return (
    <Modal open={open} onClose={onClose} title="إضافة حساب جديد" size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose} className="!bg-gray-100 !text-gray-600 hover:!bg-gray-200">إلغاء</Button>
        <Button variant="purple" disabled={!canSubmit} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>إنشاء الحساب</Button>
      </>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="الاسم الأول" variant="light" value={form.firstNameAr} onChange={(e) => set('firstNameAr', e.target.value)} />
          <Input label="اسم العائلة" variant="light" value={form.lastNameAr} onChange={(e) => set('lastNameAr', e.target.value)} />
        </div>
        <Input label="البريد الإلكتروني" type="email" variant="light" value={form.email} onChange={(e) => set('email', e.target.value)} dir="ltr" />
        <Input label="رقم الهاتف" variant="light" value={form.phone} onChange={(e) => set('phone', e.target.value)} dir="ltr" />

        <div>
          <label className="text-sm font-semibold text-brand-textBody mb-1.5 block">الدور الوظيفي (Role)</label>
          <Select value={form.role} onValueChange={onRoleChange} options={roleOptions} placeholder="اختر الدور" />
          {isAdminFamily && (
            <p className="text-[11px] text-amber-600 mt-1.5">يتطلب إنشاء هذا الدور صلاحية admins.create.</p>
          )}
        </div>

        {isAdminFamily && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم المعروض (اختياري)" variant="light" value={form.displayRoleName} onChange={(e) => set('displayRoleName', e.target.value)} placeholder={ROLE_DISPLAY_NAMES[form.role]} />
            <Input label="المسمى الوظيفي (اختياري)" variant="light" value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
          </div>
        )}

        <Input label="كلمة مرور مخصصة (اختياري — سيتم توليدها تلقائياً إن تُركت فارغة)" type="password" variant="light" value={form.password} onChange={(e) => set('password', e.target.value)} />

        {form.role && (
          <div>
            <label className="text-sm font-semibold text-brand-textBody mb-1.5 block">الصلاحيات</label>
            <PermissionSelector
              allPermissions={allPermissions}
              actorPermissions={actor.permissions}
              isPrimaryAdminActor={actor.isPrimaryAdmin()}
              selected={form.permissions}
              onChange={(v) => set('permissions', v)}
            />
          </div>
        )}

        <div>
          <label className="text-sm font-semibold text-brand-textBody mb-1.5 block">ملاحظات داخلية (اختياري)</label>
          <textarea className={`${inputCls} h-16 resize-none py-2.5`} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}

function EditAccountDrawer({ account, allPermissions, actor, onClose, onUpdated }) {
  const [tab, setTab] = useState('info')
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [tempPassword, setTempPassword] = useState(null)
  const qc = useQueryClient()

  const [editForm, setEditForm] = useState({
    firstNameAr: account.firstNameAr, lastNameAr: account.lastNameAr,
    displayRoleName: account.displayRoleName || '', jobTitle: account.jobTitle || '',
    roleDescription: account.roleDescription || '', phone: account.phone || '', notes: account.notes || '',
  })
  const [perms, setPerms] = useState(account.permissions || [])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'team'] })

  const updateMutation = useMutation({
    mutationFn: (data) => teamService.update(account._id, data),
    onSuccess: (res) => { toast.success('تم حفظ التعديلات'); invalidate(); onUpdated(res.data.data) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const permsMutation = useMutation({
    mutationFn: () => teamService.updatePermissions(account._id, perms),
    onSuccess: (res) => { toast.success('تم تحديث الصلاحيات'); invalidate(); onUpdated(res.data.data) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const statusMutation = useMutation({
    mutationFn: (isActive) => teamService.setStatus(account._id, isActive),
    onSuccess: (res) => { toast.success(res.data.data.isActive ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب'); invalidate(); onUpdated(res.data.data) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const resetPwMutation = useMutation({
    mutationFn: () => teamService.resetPassword(account._id),
    onSuccess: (res) => { setTempPassword(res.data.data.temporaryPassword); invalidate() },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const isSelf = account._id === actor._id
  const tabs = [
    { key: 'info', label: 'الملف' },
    { key: 'edit', label: 'تعديل' },
    { key: 'permissions', label: 'الصلاحيات' },
    { key: 'password', label: 'كلمة المرور' },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="fixed left-0 top-0 bottom-0 z-50 w-[480px] max-w-full bg-white overflow-y-auto" style={{ boxShadow: '4px 0 32px rgba(0,0,0,0.12)', direction: 'rtl' }}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar firstName={account.firstNameAr} lastName={account.lastNameAr} size="lg" />
              <div>
                <div className="font-heading font-bold text-gray-900 text-base">{account.firstNameAr} {account.lastNameAr}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <RoleBadge role={account.role} isPrimaryAdmin={account.isPrimaryAdmin} />
                  <StatusBadge isActive={account.isActive} />
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="flex gap-1 mt-3 p-1 bg-gray-100 rounded-xl">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-1.5 rounded-[10px] text-xs font-bold transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-6">
          {tab === 'info' && (
            <div className="py-4 space-y-3">
              <div className="text-sm text-gray-500">البريد الإلكتروني</div>
              <div className="text-sm font-semibold text-gray-800" dir="ltr">{account.email}</div>
              {account.jobTitle && (<><div className="text-sm text-gray-500 mt-2">المسمى الوظيفي</div><div className="text-sm font-semibold text-gray-800">{account.jobTitle}</div></>)}
              <div className="text-sm text-gray-500 mt-2 flex items-center gap-1.5"><Clock size={12} /> آخر تسجيل دخول</div>
              <div className="text-sm font-semibold text-gray-800">{account.lastLoginAt ? formatDateAr(account.lastLoginAt) : 'لم يسجل الدخول بعد'}</div>
              {account.createdBy && (<><div className="text-sm text-gray-500 mt-2">أُنشئ بواسطة</div><div className="text-sm font-semibold text-gray-800">{account.createdBy.firstNameAr} {account.createdBy.lastNameAr}</div></>)}

              {account.isPrimaryAdmin ? (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold flex items-center gap-2">
                  <ShieldCheck size={14} /> هذا الحساب هو المسؤول الرئيسي — محمي من الحذف والإيقاف وتعديل الصلاحيات.
                </div>
              ) : (
                <Can permission="users.disable">
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {isSelf ? (
                      <p className="text-xs text-gray-400 text-center">لا يمكنك إيقاف حسابك الخاص</p>
                    ) : (
                      <button onClick={() => account.isActive ? setConfirmDisable(true) : statusMutation.mutate(true)} disabled={statusMutation.isPending}
                        className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${account.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                        {statusMutation.isPending && <Spinner size="sm" />}
                        {account.isActive ? <><Ban size={15} /> إيقاف الحساب</> : <><CheckCircle2 size={15} /> تفعيل الحساب</>}
                      </button>
                    )}
                  </div>
                </Can>
              )}
            </div>
          )}

          {tab === 'edit' && (
            <Can permission="users.update" fallback={<p className="py-8 text-center text-sm text-gray-400">لا تملك صلاحية تعديل الحسابات</p>}>
              <form className="py-4 space-y-3" onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(editForm) }}>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="الاسم الأول" variant="light" value={editForm.firstNameAr} onChange={(e) => setEditForm((p) => ({ ...p, firstNameAr: e.target.value }))} />
                  <Input label="اسم العائلة" variant="light" value={editForm.lastNameAr} onChange={(e) => setEditForm((p) => ({ ...p, lastNameAr: e.target.value }))} />
                </div>
                {ADMIN_FAMILY_ROLES.includes(account.role) && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="الاسم المعروض" variant="light" value={editForm.displayRoleName} onChange={(e) => setEditForm((p) => ({ ...p, displayRoleName: e.target.value }))} />
                    <Input label="المسمى الوظيفي" variant="light" value={editForm.jobTitle} onChange={(e) => setEditForm((p) => ({ ...p, jobTitle: e.target.value }))} />
                  </div>
                )}
                <Input label="رقم الهاتف" variant="light" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} dir="ltr" />
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-1 block">ملاحظات داخلية</label>
                  <textarea className={`${inputCls} h-16 resize-none py-2.5`} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
                </div>
                <button type="submit" disabled={updateMutation.isPending} className="w-full h-10 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {updateMutation.isPending && <Spinner size="sm" color="border-white" />} حفظ التعديلات
                </button>
              </form>
            </Can>
          )}

          {tab === 'permissions' && (
            <Can permission="permissions.assign" fallback={<p className="py-8 text-center text-sm text-gray-400">لا تملك صلاحية إدارة الصلاحيات</p>}>
              {account.isPrimaryAdmin ? (
                <p className="py-8 text-center text-sm text-gray-400">صلاحيات المسؤول الرئيسي غير قابلة للتعديل — لديه كل الصلاحيات دائماً.</p>
              ) : isSelf ? (
                <p className="py-8 text-center text-sm text-gray-400">لا يمكنك تعديل صلاحياتك الخاصة.</p>
              ) : (
                <div className="py-4 space-y-4">
                  <PermissionSelector
                    allPermissions={allPermissions}
                    actorPermissions={actor.permissions}
                    isPrimaryAdminActor={actor.isPrimaryAdmin()}
                    selected={perms}
                    onChange={setPerms}
                  />
                  <button onClick={() => permsMutation.mutate()} disabled={permsMutation.isPending}
                    className="w-full h-10 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                    {permsMutation.isPending && <Spinner size="sm" color="border-white" />} حفظ الصلاحيات
                  </button>
                </div>
              )}
            </Can>
          )}

          {tab === 'password' && (
            <Can permission="users.reset_password" fallback={<p className="py-8 text-center text-sm text-gray-400">لا تملك صلاحية إعادة تعيين كلمات المرور</p>}>
              {account.isPrimaryAdmin ? (
                <p className="py-8 text-center text-sm text-gray-400">لا يمكن إعادة تعيين كلمة مرور المسؤول الرئيسي من هنا — يجب أن يغيّرها بنفسه.</p>
              ) : (
                <div className="py-4 space-y-3">
                  <p className="text-sm text-gray-500">سيتم توليد كلمة مرور مؤقتة جديدة، وسيُطلب من المستخدم تغييرها عند تسجيل الدخول التالي. سيتم إنهاء أي جلسة مفتوحة حالياً.</p>
                  <button onClick={() => resetPwMutation.mutate()} disabled={resetPwMutation.isPending}
                    className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                    {resetPwMutation.isPending && <Spinner size="sm" color="border-white" />} <KeyRound size={15} /> إعادة تعيين كلمة المرور
                  </button>
                </div>
              )}
            </Can>
          )}
        </div>
      </aside>

      <ConfirmDialog
        open={confirmDisable}
        onClose={() => setConfirmDisable(false)}
        onConfirm={() => { statusMutation.mutate(false); setConfirmDisable(false) }}
        title="إيقاف الحساب"
        message={`سيتم إيقاف حساب "${account.firstNameAr} ${account.lastNameAr}" فوراً وإنهاء أي جلسة دخول مفتوحة. هل تريد المتابعة؟`}
        confirmLabel="إيقاف الحساب"
        variant="danger"
      />

      <TempPasswordModal open={!!tempPassword} onClose={() => setTempPassword(null)} password={tempPassword} />
    </>
  )
}

export default function AdminAdminsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState(null)
  const [createdTempPassword, setCreatedTempPassword] = useState(null)

  const { user, isPrimaryAdmin } = useAuthStore()
  const actor = useMemo(() => ({ _id: user?._id, permissions: user?.permissions || [], isPrimaryAdmin }), [user, isPrimaryAdmin])

  const { data: rolesData } = useQuery({ queryKey: ['admin', 'roles'], queryFn: () => teamService.listRoles().then((r) => r.data.data) })
  const { data: permsData } = useQuery({ queryKey: ['admin', 'permissions-catalog'], queryFn: () => teamService.listPermissions().then((r) => r.data.data) })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'team', page, search, roleFilter, statusFilter],
    queryFn: () => teamService.list({ page, limit: 15, search, role: roleFilter || undefined, status: statusFilter || undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const roles = rolesData || []
  const allPermissions = permsData || []
  const accounts = data?.data || []

  const roleFilterOptions = [{ value: '', label: 'كل الأدوار' }, ...roles.map((r) => ({ value: r.key, label: r.displayName }))]
  const statusFilterOptions = [{ value: '', label: 'كل الحالات' }, { value: 'active', label: 'نشط' }, { value: 'inactive', label: 'موقوف' }]

  return (
    <div dir="rtl" className="space-y-5 ">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900 flex items-center gap-2"><UserCog size={22} className="text-violet-600" /> إدارة الفريق</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total || 0} حساب — المسؤولون، مساعدو الإدارة، وفريق العمليات</p>
        </div>
        <Can permission="users.create">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors hover:opacity-90 bg-violet-600">
            <Plus size={16} /> إضافة حساب
          </button>
        </Can>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="بحث بالاسم أو البريد..." dir="rtl"
            className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
        </div>
        <div className="w-48"><Select size="sm" value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }} options={roleFilterOptions} placeholder="كل الأدوار" /></div>
        <div className="w-40"><Select size="sm" value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }} options={statusFilterOptions} placeholder="كل الحالات" /></div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-violet-600" /></div>
      ) : !accounts.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center text-gray-400">
          <UserCog size={28} className="mb-3" />
          <p className="font-semibold text-gray-500">لا توجد حسابات مطابقة</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2.5">
            {accounts.map((a) => (
              <button key={a._id} onClick={() => setSelected(a)} className="w-full text-start bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
                <Avatar firstName={a.firstNameAr} lastName={a.lastNameAr} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">{a.firstNameAr} {a.lastNameAr}</div>
                  <div className="text-xs text-gray-400 truncate" dir="ltr">{a.email}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <RoleBadge role={a.role} isPrimaryAdmin={a.isPrimaryAdmin} />
                    <StatusBadge isActive={a.isActive} />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop/tablet table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-xs">
                    <th className="text-right font-bold px-4 py-3">الحساب</th>
                    <th className="text-right font-bold px-4 py-3">الدور</th>
                    <th className="text-right font-bold px-4 py-3">الحالة</th>
                    <th className="text-right font-bold px-4 py-3">آخر دخول</th>
                    <th className="text-right font-bold px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors" onClick={() => setSelected(a)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar firstName={a.firstNameAr} lastName={a.lastNameAr} size="sm" />
                          <div>
                            <div className="font-semibold text-gray-800">{a.firstNameAr} {a.lastNameAr}</div>
                            <div className="text-xs text-gray-400" dir="ltr">{a.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><RoleBadge role={a.role} isPrimaryAdmin={a.isPrimaryAdmin} /></td>
                      <td className="px-4 py-3"><StatusBadge isActive={a.isActive} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{a.lastLoginAt ? formatDateAr(a.lastLoginAt) : '—'}</td>
                      <td className="px-4 py-3 text-left">
                        <span className="text-xs font-semibold text-violet-600">إدارة</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {data?.totalPages > 1 && (
        <Pagination page={page} pages={data.totalPages} total={data.total} onPageChange={setPage} />
      )}

      <CreateAccountModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        roles={roles}
        allPermissions={allPermissions}
        actor={actor}
        onCreated={(res) => { if (res.temporaryPassword) setCreatedTempPassword(res.temporaryPassword) }}
      />
      <TempPasswordModal open={!!createdTempPassword} onClose={() => setCreatedTempPassword(null)} password={createdTempPassword} />

      {selected && (
        <EditAccountDrawer
          account={selected}
          allPermissions={allPermissions}
          actor={actor}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => setSelected(updated)}
        />
      )}
    </div>
  )
}
