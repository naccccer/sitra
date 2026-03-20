import { Badge, Button, Card, EmptyState, Input } from '@/components/shared/ui'
import { formatAmount, toPN } from '../../utils/customersView'

const projectSummaryCards = (project) => [
  { label: 'Orders', value: toPN(project?.financialSummary?.ordersCount || 0) },
  { label: 'Total', value: formatAmount(project?.financialSummary?.totalAmount || 0) },
  { label: 'Paid', value: formatAmount(project?.financialSummary?.paidAmount || 0) },
  { label: 'Due', value: formatAmount(project?.financialSummary?.dueAmount || 0) },
]

export const CustomerDetailsProjectsTab = ({
  projects = [],
  isLoadingProjects = false,
  selectedProjectId = '',
  projectDraft,
  setProjectDraft,
  canWriteCustomers = false,
  resetProjectDraft,
  handleSaveProject,
  handleToggleProject,
}) => (
  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
    <Card tone="muted" padding="md" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-black text-slate-900">Projects</div>
          <div className="text-xs font-bold text-slate-500">Select a project to edit.</div>
        </div>
        {canWriteCustomers ? <Button variant="secondary" onClick={() => resetProjectDraft(null)}>New Project</Button> : null}
      </div>
      {isLoadingProjects ? (
        <div className="text-xs font-bold text-slate-500">Loading...</div>
      ) : projects.length === 0 ? (
        <EmptyState title="No project found" description="Create a new project from the form." />
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => resetProjectDraft(project)}
              className={`w-full rounded-2xl border px-3 py-3 text-start transition-colors ${selectedProjectId === String(project.id) ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white/80 hover:bg-white'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-black text-slate-900">
                  {project.name}
                  {project.isDefault ? <Badge className="ms-2" tone="info">Default</Badge> : null}
                </div>
                <Badge tone={project.isActive ? 'success' : 'danger'}>{project.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500 sm:grid-cols-4">
                {projectSummaryCards(project).map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-50 px-2 py-2">
                    <div>{item.label}</div>
                    <div className="text-slate-900">{item.value}</div>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>

    <Card tone="muted" padding="md" className="space-y-3">
      <div className="text-sm font-black text-slate-900">{projectDraft.id ? 'Edit Project' : 'Create Project'}</div>
      <Input value={projectDraft.name} onChange={(event) => setProjectDraft((prev) => ({ ...prev, name: event.target.value }))} placeholder="Project Name" disabled={!canWriteCustomers} />
      <Input value={projectDraft.notes} onChange={(event) => setProjectDraft((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Project Notes" disabled={!canWriteCustomers} />
      <Input value={projectDraft.targetCustomerId} onChange={(event) => setProjectDraft((prev) => ({ ...prev, targetCustomerId: event.target.value }))} placeholder="Target Customer ID" dir="ltr" inputMode="numeric" disabled={!canWriteCustomers} />
      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
        <input type="checkbox" checked={Boolean(projectDraft.isDefault)} onChange={(event) => setProjectDraft((prev) => ({ ...prev, isDefault: event.target.checked }))} disabled={!canWriteCustomers} />
        Default project
      </label>
      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
        <input type="checkbox" checked={Boolean(projectDraft.isActive)} onChange={(event) => setProjectDraft((prev) => ({ ...prev, isActive: event.target.checked }))} disabled={!canWriteCustomers} />
        Active project
      </label>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={handleSaveProject} disabled={!canWriteCustomers}>{projectDraft.id ? 'Save Changes' : 'Create Project'}</Button>
        {projectDraft.id && canWriteCustomers ? <Button variant="secondary" onClick={() => resetProjectDraft(null)}>New Project</Button> : null}
        {projectDraft.id && canWriteCustomers ? (
          <Button variant={projectDraft.isActive ? 'danger' : 'success'} onClick={() => handleToggleProject(projectDraft)}>
            {projectDraft.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        ) : null}
      </div>
      {!canWriteCustomers ? <div className="text-[11px] font-bold text-slate-500">Read-only access.</div> : null}
    </Card>
  </div>
)
