import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout({ children, title }) {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <Sidebar />
      <Topbar title={title} />
      <main className="pt-16 md:pl-[240px] min-h-screen">
        <div className="p-container-padding max-w-desktop-max-width mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
