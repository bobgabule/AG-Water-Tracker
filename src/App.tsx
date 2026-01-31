import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white p-4">
        <h1 className="text-2xl font-bold">AG Water Tracker</h1>
      </header>
      <main className="p-4">
        <div className="bg-secondary text-white p-4 rounded-lg mb-4">
          <p>Phase 1 setup complete. Tailwind CSS v4 is working.</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-status-ok text-white px-2 py-1 rounded text-sm">Alive</span>
          <span className="bg-status-danger text-white px-2 py-1 rounded text-sm">Dead</span>
          <span className="bg-status-warning text-white px-2 py-1 rounded text-sm">Warning</span>
        </div>
      </main>
    </div>
  )
}

export default App
