import './App.css';
import Header from './components/header';
import Content from './components/content';
import EditProject from './components/editProject';
import NewUser from './components/newUser';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';

function App() {

  // Only for Demo
  useEffect(() => {
    if (!localStorage.getItem('state')) {
      localStorage.setItem('state', 'demo');
    }
  }, []);

  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<Content />} />
          <Route path="/edit-project/:projectId" element={<EditProject />} />
          <Route path="/new-users" element={<NewUser />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
