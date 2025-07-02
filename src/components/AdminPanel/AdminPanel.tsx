import React, { useState } from 'react';
import '../../styles/AdminPanel.css';

interface AdminPanelProps {}

export const AdminPanel: React.FC<AdminPanelProps> = () => {
  const [selectedTab, setSelectedTab] = useState<'pokemon' | 'users' | 'system'>('pokemon');

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Manage your Pokemon game system</p>
      </div>

      <div className="admin-nav">
        <button 
          className={`nav-button ${selectedTab === 'pokemon' ? 'active' : ''}`}
          onClick={() => setSelectedTab('pokemon')}
        >
          Pokemon Management
        </button>
        <button 
          className={`nav-button ${selectedTab === 'users' ? 'active' : ''}`}
          onClick={() => setSelectedTab('users')}
        >
          User Management
        </button>
        <button 
          className={`nav-button ${selectedTab === 'system' ? 'active' : ''}`}
          onClick={() => setSelectedTab('system')}
        >
          System Settings
        </button>
      </div>

      <div className="admin-content">
        {selectedTab === 'pokemon' && (
          <div className="admin-section">
            <h2>Pokemon Management</h2>
            <div className="admin-cards">
              <div className="admin-card">
                <h3>Import Pokemon Data</h3>
                <p>Import Pokemon data from external sources</p>
                <button className="admin-button primary">Import Data</button>
              </div>
              <div className="admin-card">
                <h3>Manage Pokemon Types</h3>
                <p>Add, edit, or remove Pokemon types</p>
                <button className="admin-button">Manage Types</button>
              </div>
              <div className="admin-card">
                <h3>Pokemon Statistics</h3>
                <p>View statistics about Pokemon in the system</p>
                <button className="admin-button">View Stats</button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'users' && (
          <div className="admin-section">
            <h2>User Management</h2>
            <div className="admin-cards">
              <div className="admin-card">
                <h3>Active Users</h3>
                <p>View and manage active users</p>
                <button className="admin-button primary">View Users</button>
              </div>
              <div className="admin-card">
                <h3>User Permissions</h3>
                <p>Manage user roles and permissions</p>
                <button className="admin-button">Manage Permissions</button>
              </div>
              <div className="admin-card">
                <h3>User Statistics</h3>
                <p>View user activity and statistics</p>
                <button className="admin-button">View Stats</button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'system' && (
          <div className="admin-section">
            <h2>System Settings</h2>
            <div className="admin-cards">
              <div className="admin-card">
                <h3>Database Settings</h3>
                <p>Configure database connections and settings</p>
                <button className="admin-button primary">Configure DB</button>
              </div>
              <div className="admin-card">
                <h3>API Configuration</h3>
                <p>Manage API endpoints and settings</p>
                <button className="admin-button">Configure API</button>
              </div>
              <div className="admin-card">
                <h3>System Logs</h3>
                <p>View system logs and error reports</p>
                <button className="admin-button">View Logs</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
