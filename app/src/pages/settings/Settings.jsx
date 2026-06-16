import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeader from '../../components/PageHeader'
import Spinner from '../../components/Spinner'
import ConfirmDialog from '../../components/ConfirmDialog'
import { ErrorNote } from '../dashboard/Dashboard'
import { useAuthStore, ROLE_LABELS } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { toast } from '../../store/toastStore'
import { fetchUsers, updateUserRole, adminCreateUser, adminDeleteUser, fetchAccessRequests, approveAccessRequest, rejectAccessRequest } from '../../api/admin'
import { initials } from '../../utils/format'

const ROLES = ['ADMIN', 'HR', 'VIEWER']

export default function Settings() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const { surveyTokenExpiryDays, setSurveyTokenExpiryDays } = useSettingsStore()
  const [expiryInput, setExpiryInput] = useState(surveyTokenExpiryDays)
  const [confirmRemove, setConfirmRemove] = useState(null)

  const { data: users, isLoading, error } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })

  const { data: accessRequests = [] } = useQuery({
    queryKey: ['accessRequests'],
    queryFn: fetchAccessRequests,
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Role updated.')
    },
    onError: (e) => toast.error(e.message),
  })

  const createMutation = useMutation({
    mutationFn: adminCreateUser,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      if (result?.warning) toast.error(result.warning)
      else toast.success('User invited — login details emailed with password change instructions.')
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeleteUser,
    onSuccess: (_data, userId) => {
      queryClient.setQueryData(['users'], (old) => (old ?? []).filter((u) => u.id !== userId))
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User removed.')
      setConfirmRemove(null)
    },
    onError: (e) => toast.error(e.message || 'Could not remove this user. Please try again.'),
  })

  const approveMutation = useMutation({
    mutationFn: ({ requestId, role }) => approveAccessRequest(requestId, role),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['accessRequests'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      if (result?.warning) toast.error(result.warning)
      else toast.success('Access approved — login details emailed with password change instructions.')
    },
    onError: (e) => toast.error(e.message),
  })

  const rejectMutation = useMutation({
    mutationFn: rejectAccessRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessRequests'] })
      toast.success('Access request rejected.')
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage users and survey preferences" />

      <div className="flex flex-col gap-6">
        {accessRequests.length > 0 && (
          <section className="afri-card border-l-4 border-afri-orange p-6">
            <h2 className="mb-4 font-heading text-h3 text-afri-orange">Pending access requests ({accessRequests.length})</h2>
            <div className="space-y-4">
              {accessRequests.map((req) => (
                <div key={req.id} className="flex flex-col gap-2 rounded-lg border border-afri-orange/30 bg-afri-orange/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-afri-purple">{req.name}</p>
                    <p className="text-sm text-afri-black/60">{req.email}</p>
                    {req.organisation && <p className="text-xs text-afri-black/50">{req.organisation}</p>}
                    <p className="mt-1 text-xs font-medium text-afri-orange">
                      Requested: {ROLE_LABELS[req.role_requested] ?? req.role_requested}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      id={`role-select-${req.id}`}
                      defaultValue={req.role_requested}
                      className="afri-input !w-auto !py-1.5 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const selectEl = document.getElementById(`role-select-${req.id}`)
                        const role = selectEl.value
                        approveMutation.mutate({ requestId: req.id, role })
                      }}
                      disabled={approveMutation.isPending}
                      className="afri-btn-primary !px-4 !py-1.5 text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate(req.id)}
                      disabled={rejectMutation.isPending}
                      className="afri-btn-ghost !px-4 !py-1.5 text-sm text-afri-red"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="afri-card p-6">
          <h2 className="mb-4 font-heading text-h3 text-afri-purple">User management</h2>

          {isLoading ? (
            <Spinner className="py-8" />
          ) : error ? (
            <ErrorNote error={error} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-afri-lavender text-xs uppercase tracking-wide text-afri-purple">
                    <th className="py-2">User</th>
                    <th className="py-2">Role</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-afri-lavender/60">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-afri-purple text-xs font-semibold text-afri-white">
                            {initials(u.name)}
                          </span>
                          <div>
                            <p className="font-medium text-afri-purple">{u.name}</p>
                            <p className="text-xs text-afri-black/50">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <select
                          value={u.role}
                          onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value })}
                          disabled={u.id === currentUser?.id}
                          className="afri-input !w-auto !py-1.5"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-right">
                        {u.id !== currentUser?.id && (
                          <button onClick={() => setConfirmRemove(u)} className="afri-btn-ghost !px-3 !py-1.5 text-xs text-afri-red">
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <InviteForm onInvite={(payload) => createMutation.mutate(payload)} busy={createMutation.isPending} />
        </section>

        <section className="afri-card p-6">
          <h2 className="mb-2 font-heading text-h3 text-afri-purple">Survey link expiry</h2>
          <p className="mb-4 font-body text-sm text-afri-black/60">
            How many days after a deployment ends survey links stay active. This applies to new deployments.
          </p>
          <div className="flex items-end gap-3">
            <div>
              <label className="afri-label">Expiry (days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={expiryInput}
                onChange={(e) => setExpiryInput(e.target.value)}
                className="afri-input !w-32"
              />
            </div>
            <button
              onClick={() => {
                setSurveyTokenExpiryDays(expiryInput)
                toast.success('Survey expiry updated.')
              }}
              className="afri-btn-primary"
            >
              Save
            </button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(confirmRemove)}
        title="Remove user?"
        message={`This permanently removes ${confirmRemove?.name}'s access. This cannot be undone.`}
        confirmLabel="Remove user"
        tone="danger"
        busy={deleteMutation.isPending}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => deleteMutation.mutate(confirmRemove.id)}
      />
    </div>
  )
}

function InviteForm({ onInvite, busy }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'VIEWER' })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const valid = form.name && form.email

  return (
    <div className="mt-6 border-t border-afri-lavender pt-5">
      <h3 className="mb-1 font-heading text-sm font-semibold text-afri-purple">Invite a new user</h3>
      <p className="mb-3 font-body text-xs text-afri-black/55">
        An email with login details will be sent automatically. They will be asked to change their password after signing in.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input className="afri-input" placeholder="Full name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
        <input className="afri-input" type="email" placeholder="Email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        <select className="afri-input sm:col-span-2" value={form.role} onChange={(e) => set({ role: e.target.value })}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>
      <button onClick={() => valid && onInvite(form)} disabled={!valid || busy} className="afri-btn-primary mt-3">
        {busy ? <Spinner /> : 'Invite user'}
      </button>
    </div>
  )
}
