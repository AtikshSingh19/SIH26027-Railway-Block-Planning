import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/data-processing': 'Data Processing',
  '/maintenance-records': 'Maintenance Records',
  '/block-requests': 'Block Requests',
  '/block-planner': 'AI Block Planner',
  '/train-timeline': 'Train Timeline',
  '/plans': 'Plans',
  '/simulator': 'What-if Simulator',
  '/analytics': 'Analytics',
  '/alerts': 'Alerts',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

export default function MainLayout() {
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] || 'Block Planning Console'

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-0">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header pageTitle={pageTitle} />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
