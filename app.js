<!-- ================================
     SMART HUB — PART 1
     Basic HTML Structure
================================= -->

<div id="smartHubApp">

  <!-- Header -->
  <header class="sh-header">
    <div class="sh-brand">
      <div class="sh-logo">SH</div>
      <div>
        <h1>Smart Hub</h1>
        <p>Smart • Secure • Simple</p>
      </div>
    </div>

    <button class="sh-menu-btn" onclick="shToggleMenu()" aria-label="Menu">
      ☰
    </button>
  </header>


  <!-- Main Navigation -->
  <main class="sh-main">

    <!-- Home -->
    <section id="sh-home" class="sh-page sh-active">

      <div class="sh-welcome">
        <h2>Welcome to Smart Hub</h2>
        <p>
          ایک جگہ سے Browser, Search Engine, Services,
          Safety Check, Email اور دوسری سہولیات استعمال کریں۔
        </p>
      </div>

      <div class="sh-grid">

        <button class="sh-card" onclick="shOpenPage('browser')">
          <span class="sh-card-icon">🌐</span>
          <span class="sh-card-title">Browser & Search Engine</span>
          <span class="sh-card-text">Browser اور Search Engine استعمال کریں</span>
        </button>

        <button class="sh-card" onclick="shOpenPage('services')">
          <span class="sh-card-icon">🧩</span>
          <span class="sh-card-title">Services</span>
          <span class="sh-card-text">Social, Video, Blog اور دوسری Services</span>
        </button>

        <button class="sh-card" onclick="shOpenPage('email')">
          <span class="sh-card-icon">📧</span>
          <span class="sh-card-title">Email</span>
          <span class="sh-card-text">مختلف Email Services</span>
        </button>

        <button class="sh-card" onclick="shOpenPage('safety')">
          <span class="sh-card-icon">🛡️</span>
          <span class="sh-card-title">Safety Check</span>
          <span class="sh-card-text">Website, File, AI Content اور TLS Checks</span>
        </button>

        <button class="sh-card" onclick="shOpenPage('password')">
          <span class="sh-card-icon">🔐</span>
          <span class="sh-card-title">Password Manager</span>
          <span class="sh-card-text">اپنی passwords کو محفوظ انداز میں manage کریں</span>
        </button>

        <button class="sh-card" onclick="shOpenPage('ai')">
          <span class="sh-card-icon">🤖</span>
          <span class="sh-card-title">AI Assistant</span>
          <span class="sh-card-text">Smart Hub اور connected public information</span>
        </button>

        <button class="sh-card" onclick="shOpenPage('web')">
          <span class="sh-card-icon">🔗</span>
          <span class="sh-card-title">Web</span>
          <span class="sh-card-text">My Blog, YouTube Channel اور Website</span>
        </button>

        <button class="sh-card" onclick="shOpenPage('policy')">
          <span class="sh-card-icon">📜</span>
          <span class="sh-card-title">Policy</span>
          <span class="sh-card-text">Smart Hub Policies</span>
        </button>

        <button class="sh-card" onclick="shOpenPage('complaint')">
          <span class="sh-card-icon">📩</span>
          <span class="sh-card-title">Complaint</span>
          <span class="sh-card-text">Complaint درج کرنے کا راستہ</span>
        </button>

        <button class="sh-card" onclick="shOpenPage('settings')">
          <span class="sh-card-icon">⚙️</span>
          <span class="sh-card-title">Settings</span>
          <span class="sh-card-text">Appearance, Privacy, Data اور Battery Settings</span>
        </button>

      </div>
    </section>


    <!-- Browser & Search Engine -->
    <section id="sh-browser" class="sh-page">
      <button class="sh-back" onclick="shOpenPage('home')">← Home</button>

      <h2>🌐 Browser & Search Engine</h2>

      <div class="sh-panel">
        <h3>Browser</h3>
        <p>اپنا Browser منتخب کریں۔</p>

        <button class="sh-service-btn">
          Opera
        </button>
      </div>

      <div class="sh-panel">
        <h3>Search Engine</h3>
        <p>Search Engine منتخب کریں۔</p>

        <select id="sh-search-engine" class="sh-input">
          <option>DuckDuckGo</option>
          <option>Yandex</option>
          <option>Microsoft Bing</option>
          <option>Yahoo</option>
          <option>Startpage</option>
          <option>Ecosia</option>
          <option>Mojeek</option>
          <option>Swisscows</option>
          <option>Gibiru</option>
          <option>MetaGer</option>
          <option>SearXNG</option>
          <option>Qwant</option>
        </select>

        <input
          id="sh-search-input"
          class="sh-input"
          type="text"
          placeholder="Search یا URL لکھیں..."
        >

        <button class="sh-primary-btn" onclick="shSearch()">
          Search
        </button>
      </div>
    </section>


    <!-- Services -->
    <section id="sh-services" class="sh-page">
      <button class="sh-back" onclick="shOpenPage('home')">← Home</button>

      <h2>🧩 Services</h2>

      <div class="sh-panel">
        <h3>Social Media</h3>
        <div id="sh-social-services"></div>
      </div>

      <div class="sh-panel">
        <h3>Video & Streaming</h3>
        <div id="sh-video-services"></div>
      </div>

      <div class="sh-panel">
        <h3>Blogging, Publishing & Website</h3>
        <div id="sh-blog-services"></div>
      </div>

      <div class="sh-panel">
        <h3>Social & Visual Discovery</h3>
        <div id="sh-discovery-services"></div>
      </div>

      <div class="sh-panel">
        <h3>Developer / Code</h3>
        <div id="sh-developer-services"></div>
      </div>

      <div class="sh-panel">
        <h3>Advertising & Monetization</h3>
        <div id="sh-ad-services"></div>
      </div>
    </section>


    <!-- Email -->
    <section id="sh-email" class="sh-page">
      <button class="sh-back" onclick="shOpenPage('home')">← Home</button>

      <h2>📧 Email</h2>

      <div class="sh-panel">
        <div id="sh-email-services"></div>
      </div>
    </section>


    <!-- Safety -->
    <section id="sh-safety" class="sh-page">
      <button class="sh-back" onclick="shOpenPage('home')">← Home</button>

      <h2>🛡️ Safety Check</h2>

      <div class="sh-panel">
        <h3>Website & File Safety</h3>
        <div id="sh-safety-services"></div>
      </div>

      <div class="sh-panel">
        <h3>AI Content Check</h3>

        <button class="sh-service-btn">
          🖼️ AI Image Check
        </button>

        <button class="sh-service-btn">
          🎥 AI Video Check
        </button>
      </div>

      <div class="sh-panel">
        <h3>Encryption / TLS Check</h3>

        <button class="sh-service-btn">
          🔒 SSL/TLS Server Test
        </button>

        <button class="sh-service-btn">
          🔐 Hardenize
        </button>

        <button class="sh-service-btn">
          🛡️ HTTP Observatory
        </button>
      </div>
    </section>


    <!-- Password Manager -->
    <section id="sh-password" class="sh-page">
      <button class="sh-back" onclick="shOpenPage('home')">← Home</button>

      <h2>🔐 Password Manager</h2>

      <div class="sh-panel">

        <label>Name / Title</label>
        <input
          id="sh-pm-title"
          class="sh-input"
          type="text"
          placeholder="مثلاً Gmail"
        >

        <label>Email / Username</label>
        <input
          id="sh-pm-username"
          class="sh-input"
          type="text"
          placeholder="Email یا Username"
        >

        <label>Password</label>
        <input
          id="sh-pm-password"
          class="sh-input"
          type="password"
          placeholder="Password"
        >

        <label>Description (100 characters maximum)</label>
        <textarea
          id="sh-pm-description"
          class="sh-input"
          maxlength="100"
          placeholder="ضروری معلومات، زیادہ سے زیادہ 100 characters"
        ></textarea>

        <button class="sh-primary-btn">
          Add Password
        </button>

      </div>
    </section>


    <!-- AI Assistant -->
    <section id="sh-ai" class="sh-page">
      <button class="sh-back" onclick="shOpenPage('home')">← Home</button>

      <h2>🤖 AI Assistant</h2>

      <div class="sh-panel">
        <p>
          AI Assistant صرف Smart Hub اور connected
          public sources سے متعلق معلومات فراہم کرے گا۔
        </p>

        <textarea
          id="sh-ai-question"
          class="sh-input"
          placeholder="اپنا سوال لکھیں..."
        ></textarea>

        <button class="sh-primary-btn">
          Ask AI
        </button>

        <div id="sh-ai-answer" class="sh-ai-answer">
          AI جواب یہاں ظاہر ہوگا۔
        </div>
      </div>
    </section>


    <!-- Web -->
    <section id="sh-web" class="sh-page">
      <button class="sh-back" onclick="shOpenPage('home')">← Home</button>

      <h2>🔗 Web</h2>

      <div class="sh-panel">
        <h3>My Web</h3>

        <a
          class="sh-service-btn"
          href="https://hakimasifarainofficial.blogspot.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          📝 My Blog
        </a>

        <a
          class="sh-service-btn"
          href="https://www.youtube.com/@Asif_Arain171"
          target="_blank"
          rel="noopener noreferrer"
        >
          ▶️ My YouTube Channel
        </a>

        <a
          class="sh-service-btn"
          href="#"
          target="_blank"
          rel="noopener noreferrer"
        >
          🌐 My Website
        </a>
      </div>
    </section>


    <!-- Policy -->
    <section id="sh-policy" class="sh-page">
      <button class="sh-back" onclick="shOpenPage('home')">← Home</button>

      <h2>📜 Policy</h2>

      <div class="sh-panel">
        <h3>Smart Hub Policy</h3>

        <p>
          Smart Hub کی Privacy, Security, AI Assistant,
          Data اور استعمال سے متعلق policies یہاں موجود ہوں گی۔
        </p>

        <button class="sh-service-btn">Privacy Policy</button>
        <button class="sh-service-btn">Security Policy</button>
        <button class="sh-service-btn">AI Assistant Policy</button>
        <button class="sh-service-btn">Data Policy</button>
        <button class="sh-service-btn">Terms of Use</button>
      </div>
    </section>


    <!-- Complaint -->
    <section id="sh-complaint" class="sh-page">
      <button class="sh-back" onclick="shOpenPage('home')">← Home</button>

      <h2>📩 Complaint</h2>

      <div class="sh-panel">

        <p>
          Complaint براہِ راست Complaint System کے ذریعے درج کی جائے گی۔
          AI Assistant خود Complaint وصول نہیں کرے گا۔
        </p>

        <label>Name</label>
        <input
          id="sh-complaint-name"
          class="sh-input"
          type="text"
          placeholder="اپنا نام"
        >

        <label>Email</label>
        <input
          id="sh-complaint-email"
          class="sh-input"
          type="email"
          placeholder="اپنا Email"
        >

        <label>Complaint</label>
        <textarea
          id="sh-complaint-text"
          class="sh-input"
          placeholder="اپنی Complaint لکھیں..."
        ></textarea>

        <button class="sh-primary-btn">
          Submit Complaint
        </button>

      </div>
    </section>


    <!-- Settings -->
    <section id="sh-settings" class="sh-page">
      <button class="sh-back" onclick="shOpenPage('home')">← Home</button>

      <h2>⚙️ Settings</h2>

      <div class="sh-panel">
        <h3>Appearance</h3>

        <button class="sh-service-btn">☀️ Light Mode</button>
        <button class="sh-service-btn">🌙 Dark Mode</button>
        <button class="sh-service-btn">📱 System Default</button>
      </div>

      <div class="sh-panel">
        <h3>Data Saver</h3>
        <button class="sh-service-btn">Data Saver ON / OFF</button>
        <button class="sh-service-btn">Reduce Image Loading</button>
        <button class="sh-service-btn">Reduce Video Loading</button>
        <button class="sh-service-btn">Block Auto-Play</button>
      </div>

      <div class="sh-panel">
        <h3>Battery Saver</h3>
        <button class="sh-service-btn">Battery Saver ON / OFF</button>
        <button class="sh-service-btn">Reduce Animations</button>
        <button class="sh-service-btn">Reduce Auto Refresh</button>
        <button class="sh-service-btn">Reduce Background Activity</button>
      </div>

      <div class="sh-panel">
        <h3>Privacy</h3>
        <button class="sh-service-btn">Save Search History ON / OFF</button>
        <button class="sh-service-btn">Clear Search History</button>
        <button class="sh-service-btn">Clear Browsing Data</button>
        <button class="sh-service-btn">Clear Local Data</button>
      </div>

      <div class="sh-panel">
        <h3>Security</h3>
        <button class="sh-service-btn">Settings Lock / PIN</button>
        <button class="sh-service-btn">Auto-Lock Settings</button>
        <button class="sh-service-btn">Clear Sensitive Local Data</button>
      </div>

      <div class="sh-panel">
        <h3>General</h3>
        <button class="sh-service-btn">Language</button>
        <button class="sh-service-btn">Reset Settings</button>
        <button class="sh-service-btn">About Smart Hub</button>
      </div>

    </section>

  </main>


  <!-- Footer -->
  <footer class="sh-footer">
    <p>Smart Hub</p>
    <p>Truth • Security • Privacy • Simplicity</p>
  </footer>

</div>
