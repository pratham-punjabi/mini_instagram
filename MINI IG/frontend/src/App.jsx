import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Create axios instance WITH better interceptor
const createAPI = () => {
  const instance = axios.create({
    baseURL: 'http://localhost:5000/api',
  });

  // FIXED: Better interceptor that actually adds token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      console.log(`Interceptor - ${config.method.toUpperCase()} ${config.url}`);
      console.log('Interceptor - Token exists:', !!token);
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Interceptor - Authorization header set');
      } else {
        console.warn('Interceptor - No token found for request!');
      }
      
      return config;
    },
    (error) => {
      console.error('Interceptor error:', error);
      return Promise.reject(error);
    }
  );

  return instance;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ imageUrl: '', caption: '' });
  const [testImageUrls] = useState([
    'https://picsum.photos/600/400',
    'https://picsum.photos/500/500',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
    'https://images.unsplash.com/photo-1579546929662-711aa81148cf'
  ]);

  // Create API instance
  const API = createAPI();

  // Debug logging
  useEffect(() => {
    console.log('App State:', {
      isLoggedIn,
      loading,
      postsCount: posts.length,
      newPost,
      hasToken: !!localStorage.getItem('token')
    });
  }, [isLoggedIn, loading, posts, newPost]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetchFeed();
    }
  }, []);

  const fetchFeed = async () => {
    try {
      console.log('Fetching feed...');
      const response = await API.get('/posts/feed');
      console.log('Feed response:', response.data);
      setPosts(response.data);
    } catch (err) {
      console.log('Could not fetch feed:', err.message);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        localStorage.removeItem('token');
      }
      setPosts([]);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      // First, try to create a test user using direct fetch
      try {
        console.log('Creating test user...');
        const signupRes = await fetch('http://localhost:5000/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123'
          })
        });
        const signupData = await signupRes.json();
        console.log('Signup response:', signupData);
      } catch (signupErr) {
        console.log('User might already exist, continuing to login...');
      }

      // Then login using direct fetch
      console.log('Logging in...');
      const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });
      
      const loginData = await loginRes.json();
      console.log('Login response:', loginData);
      
      if (loginData.token) {
        localStorage.setItem('token', loginData.token);
        console.log('Token saved to localStorage:', loginData.token.substring(0, 20) + '...');
        setIsLoggedIn(true);
        fetchFeed();
      } else {
        throw new Error(loginData.msg || 'No token received');
      }
      
    } catch (err) {
      console.error('Login error:', err);
      setError(`Login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setPosts([]);
    setError('');
  };

  // FIXED: handleCreatePost function
  const handleCreatePost = async (e) => {
    e.preventDefault();
    console.log('=== CREATE POST STARTED ===');
    console.log('Form data:', newPost);
    
    // Get token manually for debugging
    const token = localStorage.getItem('token');
    console.log('Token from localStorage:', token ? '✅ Present' : '❌ Missing');
    
    // Validate
    if (!newPost.imageUrl.trim() || !newPost.caption.trim()) {
      setError('❌ Please fill in both image URL and caption');
      return;
    }
    
    setLoading(true);
    setError('Creating post...');
    
    try {
      console.log('Making API call to /posts...');
      
      // Use direct fetch with manual headers to ensure token is sent
      const response = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPost)
      });
      
      const data = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.msg || `HTTP ${response.status}`);
      }
      
      // Success
      setNewPost({ imageUrl: '', caption: '' });
      setError('✅ Post created successfully!');
      
      // Refresh feed
      setTimeout(() => {
        fetchFeed();
        setLoading(false);
        setError('');
      }, 1000);
      
    } catch (err) {
      console.error('❌ POST ERROR:', err);
      
      if (err.message.includes('401') || err.message.includes('No token')) {
        setError('❌ Token expired or invalid. Please logout and login again.');
        localStorage.removeItem('token');
      } else {
        setError(`❌ Error: ${err.message}`);
      }
      setLoading(false);
    }
  };

  const handleLike = async (postId) => {
    console.log('Liking post:', postId);
    try {
      await API.put(`/posts/like/${postId}`);
      fetchFeed();
    } catch (err) {
      console.error('Error liking post:', err);
      setError('Failed to like post');
    }
  };

  const handleTestImage = (url) => {
    setNewPost({ ...newPost, imageUrl: url });
  };

  // Add debug panel
  const DebugPanel = () => (
    <div style={{ 
      padding: '15px', 
      background: '#fff3cd', 
      borderRadius: '5px', 
      marginBottom: '20px',
      border: '1px solid #ffeaa7'
    }}>
      <h4 style={{ marginTop: '0', color: '#856404' }}>🔧 Debug Panel</h4>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <button
          onClick={() => {
            const token = localStorage.getItem('token');
            console.log('Token debug:', {
              exists: !!token,
              length: token?.length || 0,
              first20: token ? token.substring(0, 20) + '...' : 'none',
              full: token
            });
            alert(`Token: ${token ? '✅ Present' : '❌ Missing'}\nLength: ${token?.length || 0} chars`);
          }}
          style={{ padding: '8px 16px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          Check Token
        </button>
        
        <button
          onClick={async () => {
            const token = localStorage.getItem('token');
            if (!token) {
              alert('No token found!');
              return;
            }
            
            try {
              // Test token with feed
              const response = await fetch('http://localhost:5000/api/posts/feed', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const data = await response.json();
              console.log('Token test - Feed:', data);
              alert(`✅ Token works! Got ${data.length || 0} posts`);
            } catch (err) {
              console.error('Token test error:', err);
              alert(`❌ Token invalid: ${err.message}`);
            }
          }}
          style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          Test Token
        </button>
        
        <button
          onClick={handleLogout}
          style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          Logout
        </button>
      </div>
      
      <div style={{ fontSize: '12px', color: '#666' }}>
        <p>Token Status: <strong>{localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}</strong></p>
        <p>Check browser console (F12) for detailed logs</p>
      </div>
    </div>
  );

  if (!isLoggedIn) {
    return (
      <div className="App">
        <nav className="navbar">
          <div className="nav-content">
            <h1 className="logo">📸 Instagram Clone</h1>
          </div>
        </nav>
        
        <div className="auth-container">
          <h2>Welcome to Instagram Clone</h2>
          <p>Your backend is running at: <strong>http://localhost:5000</strong></p>
          
          <div className="feature-card">
            <h3>✅ Project Setup Complete!</h3>
            <div className="feature-section">
              <p>Features implemented:</p>
              <ul>
                <li>Node.js/Express Backend</li>
                <li>MongoDB Atlas Database</li>
                <li>User Authentication (JWT)</li>
                <li>Follow/Unfollow System</li>
                <li>Post Creation & Feed</li>
                <li>Like/Comment System</li>
              </ul>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button
              onClick={handleLogin}
              disabled={loading}
              className="auth-button"
            >
              {loading ? 'Logging in...' : 'Login with Test Account'}
            </button>
            
            <div className="test-credentials">
              <p>Test Account:</p>
              <small>Email: test@example.com</small><br />
              <small>Password: password123</small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-content">
          <h1 className="logo">📸 Instagram Clone</h1>
          <div className="nav-links">
            <span>Welcome, User!</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </nav>
      
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>Dashboard</h2>
          <p>Connected to backend: <strong>http://localhost:5000</strong></p>
          {error && (
            <div className={`error-message ${error.includes('✅') ? 'success-message' : ''}`}>
              {error}
            </div>
          )}
        </div>
        
        {/* Add Debug Panel */}
        <DebugPanel />
        
        <div className="dashboard-content">
          {/* Create Post Form */}
          <div className="create-post-card">
            <h3>Create New Post</h3>
            <form onSubmit={handleCreatePost}>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Image URL (e.g., https://picsum.photos/600/400)"
                  value={newPost.imageUrl}
                  onChange={(e) => setNewPost({...newPost, imageUrl: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              
              <div className="test-images">
                <p style={{ fontSize: '14px', marginBottom: '8px' }}>Quick test images:</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {testImageUrls.map((url, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleTestImage(url)}
                      style={{
                        padding: '6px 12px',
                        background: '#f0f0f0',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Image {index + 1}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <textarea
                  placeholder="Write a caption..."
                  value={newPost.caption}
                  onChange={(e) => setNewPost({...newPost, caption: e.target.value})}
                  className="form-textarea"
                  rows="3"
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className="submit-button"
                disabled={loading || !newPost.imageUrl.trim() || !newPost.caption.trim()}
              >
                {loading ? 'Creating...' : 'Share Post'}
              </button>
            </form>
          </div>
          
          {/* Posts Feed */}
          <div className="feed-section">
            <h3>Your Feed ({posts.length} posts)</h3>
            {posts.length === 0 ? (
              <div className="empty-state">
                <p>No posts yet. Create your first post above!</p>
                <p>Or follow other users to see their posts.</p>
              </div>
            ) : (
              <div className="posts-grid">
                {posts.map(post => (
                  <div key={post._id} className="post-card">
                    <div className="post-header">
                      <div className="post-avatar">
                        {post.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="post-user-info">
                        <strong>{post.user?.username || 'Unknown User'}</strong>
                        <small>{new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                      </div>
                    </div>
                    
                    {post.imageUrl && (
                      <img 
                        src={post.imageUrl} 
                        alt={post.caption}
                        className="post-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const placeholder = document.createElement('div');
                          placeholder.className = 'image-placeholder';
                          placeholder.textContent = 'Image not available';
                          e.target.parentNode.appendChild(placeholder);
                        }}
                      />
                    )}
                    
                    <div className="post-caption">
                      <p>{post.caption}</p>
                    </div>
                    
                    <div className="post-actions">
                      <button 
                        onClick={() => handleLike(post._id)}
                        className="like-button"
                      >
                        ❤️ Like ({post.likes?.length || 0})
                      </button>
                      <span className="comments-count">
                        💬 Comments ({post.comments?.length || 0})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;