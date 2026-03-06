// TWIN PRO - Real Features Widget (Not Fake)
document.addEventListener('DOMContentLoaded', () => {
    // Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
        .twin-pro-fab {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
            border-radius: 50%;
            box-shadow: 0 10px 25px rgba(168, 85, 247, 0.5);
            cursor: pointer;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .twin-pro-fab:hover { transform: scale(1.1) rotate(15deg); }
        .twin-pro-icon { color: white; font-size: 24px; font-weight: bold; }
        .twin-pro-menu {
            position: fixed;
            bottom: 100px;
            right: 30px;
            width: 280px;
            background: rgba(30, 41, 59, 0.95);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            z-index: 9998;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            pointer-events: none;
            transition: all 0.3s ease;
            color: #fff;
        }
        .twin-pro-menu.active {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }
        .twin-pro-menu-item {
            padding: 15px;
            margin-bottom: 10px;
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .twin-pro-menu-item:hover {
            background: rgba(99, 102, 241, 0.3);
            transform: translateX(5px);
        }
        .pro-badge {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: #000;
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 10px;
            font-weight: bold;
            margin-left: auto;
        }
    `;
    document.head.appendChild(style);

    // Create Menu with REAL Features
    const menu = document.createElement('div');
    menu.className = 'twin-pro-menu';
    menu.innerHTML = `
        <div style="font-size: 14px; color: #6366f1; margin-bottom: 15px; font-weight: 600;">
            ✦ PRO FEATURES
        </div>
        
        <div class="twin-pro-menu-item" onclick="conversationMode.start()">
            <span style="font-size: 20px;">🎙️</span>
            <div>
                <div style="font-weight: 600;">Live Conversation</div>
                <div style="font-size: 12px; color: #94a3b8;">Two-way voice translation</div>
            </div>
            <span class="pro-badge">PRO</span>
        </div>
        
        <div class="twin-pro-menu-item" onclick="turboMode.enable()">
            <span style="font-size: 20px;">🚀</span>
            <div>
                <div style="font-weight: 600;">Turbo Speed</div>
                <div style="font-size: 12px; color: #94a3b8;">Instant cached results</div>
            </div>
            <span class="pro-badge">PRO</span>
        </div>
        
        <div class="twin-pro-menu-item" onclick="alert('Document scanning requires camera access. Coming in next update!')">
            <span style="font-size: 20px;">📷</span>
            <div>
                <div style="font-weight: 600;">Scan Document</div>
                <div style="font-size: 12px; color: #94a3b8;">OCR text extraction</div>
            </div>
            <span style="background: #475569; color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-left: auto;">SOON</span>
        </div>
        
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
            <a href="#pricing" onclick="document.querySelector(''.twin-pro-menu'').classList.remove('active')" 
               style="color: #6366f1; text-decoration: none; font-size: 14px; font-weight: 600;">
                Upgrade to Pro →
            </a>
        </div>
    `;

    // Create FAB Button
    const fab = document.createElement('div');
    fab.className = 'twin-pro-fab';
    fab.innerHTML = '<span class="twin-pro-icon">✦</span>';
    fab.addEventListener('click', () => menu.classList.toggle('active'));

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!fab.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.remove('active');
        }
    });

    document.body.appendChild(menu);
    document.body.appendChild(fab);
});
