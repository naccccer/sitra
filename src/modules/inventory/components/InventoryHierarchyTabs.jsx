import { cn } from '@/components/shared/ui/cn'

const MainTabButton = ({ tab, isActive, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(tab.id)}
    className={cn(
      'focus-ring inline-flex min-h-10 items-center rounded-[var(--radius-lg)] border px-3 py-2 text-[13px] font-bold transition duration-[var(--motion-fast)]',
      isActive
        ? 'border-[rgb(var(--ui-primary))] bg-[rgb(var(--ui-primary))] text-white shadow-[var(--shadow-soft)]'
        : 'border-transparent bg-transparent text-[rgb(var(--ui-text-muted))] hover:border-[rgb(var(--ui-border-soft))] hover:bg-white/72 hover:text-[rgb(var(--ui-text))]',
    )}
  >
    {tab.label}
  </button>
)

const ChildTabButton = ({ tab, isActive, onClick, compact = false }) => (
  <button
    type="button"
    onClick={() => onClick(tab.id)}
    className={cn(
      'focus-ring inline-flex items-center rounded-full border transition duration-[var(--motion-fast)]',
      compact ? 'min-h-8 px-3 py-1 text-[12px] font-bold' : 'min-h-9 px-3 py-1.5 text-[12px] font-bold',
      isActive
        ? 'border-[rgb(var(--ui-primary))] bg-white text-[rgb(var(--ui-primary))] shadow-[0_10px_24px_rgba(20,20,24,0.08)]'
        : 'border-transparent bg-transparent text-[rgb(var(--ui-text-muted))] hover:bg-white/70 hover:text-[rgb(var(--ui-text))]',
    )}
  >
    {tab.label}
  </button>
)

export const InventoryHierarchyTabs = ({
  tabs,
  activeTabId,
  onTabChange,
  childTabs = [],
  activeChildId = '',
  onChildChange = () => {},
  grandchildTabs = [],
  activeGrandchildId = '',
  onGrandchildChange = () => {},
}) => {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1 rounded-[var(--radius-xl)] bg-[rgb(var(--ui-surface-muted))]/72 p-1">
        {tabs.map((tab) => (
          <MainTabButton
            key={tab.id}
            tab={tab}
            isActive={activeTabId === tab.id}
            onClick={onTabChange}
          />
        ))}
      </div>

      {childTabs.length > 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-[rgb(var(--ui-border-soft))] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,246,250,0.82))] px-3 py-2.5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-center gap-1.5">
            {childTabs.map((tab) => (
              <ChildTabButton
                key={tab.id}
                tab={tab}
                isActive={activeChildId === tab.id}
                onClick={onChildChange}
              />
            ))}
          </div>

          {grandchildTabs.length > 0 ? (
            <div className="me-3 mt-2.5 border-r border-[rgb(var(--ui-border-soft))] pr-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {grandchildTabs.map((tab) => (
                  <ChildTabButton
                    key={tab.id}
                    tab={tab}
                    isActive={activeGrandchildId === tab.id}
                    onClick={onGrandchildChange}
                    compact
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
