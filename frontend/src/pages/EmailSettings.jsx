import { useEffect, useState } from 'react'
import { Mail, ToggleLeft, ToggleRight, Send, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getEmailSettings, saveEmailSettings, sendTestEmail } from '../api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function EmailSettings() {
  const [settings, setSettings] = useState({
    daily_enabled: true,
    weekly_enabled: true,
    weekly_send_day: 6,
    weekly_send_hour: 20,
    weekly_send_minute: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)

  // Read teacher info from localStorage
  const teacher = (() => {
    try { return JSON.parse(localStorage.getItem('teacher') || '{}') } catch { return {} }
  })()

  useEffect(() => {
    getEmailSettings()
      .then((res) => setSettings(res.data))
      .catch(() => toast.error('Failed to load email settings'))
      .finally(() => setLoading(false))
  }, [])

  const saveSettings = async (updated) => {
    try {
      setSaving(true)
      await saveEmailSettings(updated)
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const toggleSetting = (key) => {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    saveSettings(updated)
  }

  const handleTimeChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: parseInt(value, 10) }))
  }

  const saveTime = () => saveSettings(settings)

  const handleSendTest = async () => {
    const email = teacher.email || ''
    const name = teacher.name || 'Teacher'
    if (!email) {
      toast.error('Could not find teacher email. Please log in again.')
      return
    }
    try {
      setSendingTest(true)
      await sendTestEmail(email, name)
      toast.success(`Test email sent to ${email}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) return <p className="text-slate-500">Loading settings…</p>

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Mail className="text-indigo-600" size={26} />
          Email Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure automated attendance email notifications for students and parents.
        </p>
      </div>

      {/* Daily emails toggle */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Daily Attendance Summary</h3>
            <p className="text-sm text-slate-500 mt-1">
              Sent to each student (and CC parent) when all of today's sessions have had attendance taken.
              Teachers can also trigger it manually from the results page.
            </p>
          </div>
          <button
            onClick={() => toggleSetting('daily_enabled')}
            className="flex-shrink-0 ml-4"
            title={settings.daily_enabled ? 'Disable daily emails' : 'Enable daily emails'}
          >
            {settings.daily_enabled
              ? <ToggleRight size={40} className="text-indigo-600" />
              : <ToggleLeft size={40} className="text-slate-400" />}
          </button>
        </div>
        <div className={`mt-3 flex items-center gap-2 text-sm font-medium ${settings.daily_enabled ? 'text-green-600' : 'text-slate-400'}`}>
          {settings.daily_enabled
            ? <><CheckCircle2 size={14} /> Enabled</>
            : <><AlertCircle size={14} /> Disabled</>}
        </div>
      </div>

      {/* Weekly emails toggle + time */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Weekly Attendance Report</h3>
            <p className="text-sm text-slate-500 mt-1">
              Comprehensive week-by-week summary with subject breakdown, session notes, and overall trend.
            </p>
          </div>
          <button
            onClick={() => toggleSetting('weekly_enabled')}
            className="flex-shrink-0 ml-4"
            title={settings.weekly_enabled ? 'Disable weekly emails' : 'Enable weekly emails'}
          >
            {settings.weekly_enabled
              ? <ToggleRight size={40} className="text-indigo-600" />
              : <ToggleLeft size={40} className="text-slate-400" />}
          </button>
        </div>

        <div className={`flex items-center gap-2 text-sm font-medium ${settings.weekly_enabled ? 'text-green-600' : 'text-slate-400'}`}>
          {settings.weekly_enabled
            ? <><CheckCircle2 size={14} /> Enabled</>
            : <><AlertCircle size={14} /> Disabled</>}
        </div>

        {/* Time picker */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Send Time</span>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Day</label>
              <select
                value={settings.weekly_send_day}
                onChange={(e) => handleTimeChange('weekly_send_day', e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              >
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Hour (24h)</label>
              <input
                type="number"
                min={0}
                max={23}
                value={settings.weekly_send_hour}
                onChange={(e) => handleTimeChange('weekly_send_hour', e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-20 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Minute</label>
              <input
                type="number"
                min={0}
                max={59}
                value={settings.weekly_send_minute}
                onChange={(e) => handleTimeChange('weekly_send_minute', e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-20 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <button
              onClick={saveTime}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Time'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Note: Changes to the send time take effect on the next app restart.
          </p>
        </div>
      </div>

      {/* Test email */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-semibold text-slate-800 mb-1">Send Test Email</h3>
        <p className="text-sm text-slate-500 mb-4">
          Send a sample daily attendance summary to your own registered email address
          {teacher.email ? ` (${teacher.email})` : ''} so you can preview the template.
        </p>
        <button
          onClick={handleSendTest}
          disabled={sendingTest}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:opacity-60 transition-colors"
        >
          <Send size={15} />
          {sendingTest ? 'Sending…' : 'Send Test Email'}
        </button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm text-blue-800 font-medium mb-1">Gmail App Password Required</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          Emails are sent via Gmail SMTP. Ensure <code className="bg-blue-100 px-1 rounded">MAIL_EMAIL</code> and{' '}
          <code className="bg-blue-100 px-1 rounded">MAIL_PASSWORD</code> are set in the backend <code className="bg-blue-100 px-1 rounded">.env</code> file.
          Use an App Password (not your Gmail login) — see the comments in .env for instructions.
        </p>
      </div>
    </div>
  )
}
