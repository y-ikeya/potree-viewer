import './App.css';
import PotreeViewer from './components/PotreeViewer';

function App() {
  return (
    <div className="App" style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>      
      <PotreeViewer 
        width={window.innerWidth}
        height={window.innerHeight}
        className="potree-container"
      />
    </div>
  );
}

export default App;
