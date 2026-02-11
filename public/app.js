import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

const supabaseUrl = 'https://ijyzgiocbhgqpfsauapm.supabase.co/';
const supabaseKey = 'sb_publishable_rzM3V_W7Y2kP9juN_vpUIA_2nYrAVOb';
const supabase = createClient(supabaseUrl, supabaseKey);

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCLQ9bn3zp65FRhxat-QHcVnQfeiehjf3k",
    authDomain: "hcpa-project-nexus.firebaseapp.com",
    projectId: "hcpa-project-nexus",
    storageBucket: "hcpa-project-nexus.firebasestorage.app",
    messagingSenderId: "276730700584",
    appId: "1:276730700584:web:9b1047461ce72f3371e61d",
    measurementId: "G-V2VKZ8FHFV"
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

// VAPID Key
const VAPID_KEY = "BPeFoXdfW_5QKbCm9XLAaZYBrNQHudWuyv_-UvY75Yq2DAU2gYm6qu47q8AMWEW_hmtw2MPn83VQUOgJpjF4Yas";

let serviceWorkerRegistration = null;

// Enhanced Service Worker Registration with Skip Waiting
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.error('Service workers are not supported');
        return null;
    }

    try {
        console.log('Registering service worker...');
        
        // First, unregister any existing service workers to start fresh
        const existingRegistrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of existingRegistrations) {
            console.log('Unregistering old service worker:', registration.scope);
            await registration.unregister();
        }
        
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Register the service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
        });
        
        console.log('✓ Service worker registered with scope:', registration.scope);
        
        // Handle the waiting service worker by telling it to skip waiting
        if (registration.waiting) {
            console.log('Service worker is waiting, sending skip waiting message...');
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Handle installing service worker
        if (registration.installing) {
            console.log('Service worker is installing...');
            registration.installing.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Listen for controller change (when new SW takes over)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('✓ New service worker activated!');
        });
        
        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('✓ Service worker ready');
        
        // Get the active registration
        const activeRegistration = await navigator.serviceWorker.getRegistration();
        
        if (!activeRegistration?.active) {
            // If still not active, reload the page
            console.log('Service worker not active, reloading page...');
            window.location.reload();
            return null;
        }
        
        console.log('✓ Service worker is ACTIVE');
        serviceWorkerRegistration = activeRegistration;
        return activeRegistration;
        
    } catch (err) {
        console.error('✗ Service worker registration failed:', err);
        return null;
    }
}

// Initialize on load
registerServiceWorker();

// Request Notification Permission
async function requestPermission() {
    try {
        console.log('=== Starting permission request ===');
        
        // Check if we already have an active service worker
        const currentReg = await navigator.serviceWorker.getRegistration();
        
        if (!currentReg?.active) {
            console.log('No active service worker, registering...');
            serviceWorkerRegistration = await registerServiceWorker();
            
            if (!serviceWorkerRegistration) {
                alert('Failed to activate service worker. The page will reload to try again.');
                window.location.reload();
                return;
            }
        } else {
            serviceWorkerRegistration = currentReg;
            console.log('✓ Using existing active service worker');
        }
        
        console.log('Service worker state:', {
            active: serviceWorkerRegistration.active ? 'yes' : 'no',
            installing: serviceWorkerRegistration.installing ? 'yes' : 'no',
            waiting: serviceWorkerRegistration.waiting ? 'yes' : 'no'
        });
        
        // Request notification permission
        const permission = await Notification.requestPermission();
        console.log('Permission result:', permission);
        
        if (permission === 'granted') {
            console.log('✓ Notification permission granted');
            console.log('Getting FCM token...');
            
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: serviceWorkerRegistration
            });
        
            if (token) {
                console.log('✓ FCM Token:', token);
                
                // Save to localStorage
                localStorage.setItem('messagingPermission', 'granted');
                localStorage.setItem('fcmToken', token);
                console.log('✓ Saved to localStorage');
                
                // Save to Firestore
                try {
                    await addDoc(collection(db, "fcmTokens"), {
                        token: token,
                        createdAt: new Date()
                    });
                    console.log('✓ Token saved to Firestore');
                } catch (firestoreError) {
                    console.error('Error saving to Firestore:', firestoreError);
                }
                
                // Hide popup
                document.getElementById('permissionOverlay').style.display = 'none';
                alert('Notifications enabled successfully!');
            } else {
                console.error('Token is empty');
            }
        } else {
            console.log('✗ Notification permission denied');
            localStorage.setItem('messagingPermission', 'denied');
            document.getElementById('permissionOverlay').style.display = 'none';
        }
    } catch (err) {
        console.error('✗ Error:', err);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        localStorage.setItem('messagingPermission', 'error');
        alert('Error: ' + err.message);
    }
}

// Deny Permission
function denyPermission() {
    console.log('User denied permission');
    localStorage.setItem('messagingPermission', 'denied');
    document.getElementById('permissionOverlay').style.display = 'none';
}

// Handle foreground messages
onMessage(messaging, (payload) => {
    console.log('🔔 Message received:', payload);
    alert(`${payload.notification.title}: ${payload.notification.body}`);
});

// Attach event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('requestToken')?.addEventListener('click', requestPermission);
    document.getElementById('denyToken')?.addEventListener('click', denyPermission);
});

// NAVIGATION SECTION
async function navMenu() {
    var x = document.getElementById("myTopnav");
    const login_data = await getLogin();
    const role = login_data.role;

    x.className = x.className === "topnav" ? "topnav responsive" : "topnav";

    if (['admin', 'organizer', 'superuser'].includes(role)) {
      x.innerHTML = `
          <a href="main_portal.html#home" class="active">Home</a>
          <a href="main_portal.html#announcement-section">Announcements</a>
          <a href="main_portal.html#myinformation-section">My Info</a>
          <a href="main_portal.html#chapterinformation-section">Chapter</a>
          <a href="main_portal.html#MRC-section">MRC</a>
          <a href="index.html" onclick="signOut()">Sign Out</a>
          <a href="admin_portal.html">Admin</a>
          <a href="javascript:void(0);" class="icon" onclick="navMenu()">
            <i class="fa fa-bars"></i>
          </a>`
  }
}

// AUTHENTICATION
async function getLogin() {
    try {
        const { data, error } = await supabase.auth.getSession()

        if (error) throw error;

        if (!data?.session?.user?.id) {
            throw new Error('No active session');
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, chapter, role')
            .eq('id', data.session.user.id)
            .single();
        
        if (profileError) throw profileError;

        return {
            first_name: profile.first_name,
            chapter: profile.chapter,
            role: profile.role
        };
    } catch (error) {
        console.error('Error getting login data:', error);
        throw error;
    }
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
}

// ANNOUNCEMENTS
async function loadAnnouncements() {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('visible', true)
            .eq('deleted', false)
            .order('type')
            .order('created_at');
            
        if (error) throw error;

        const tableBody = document.getElementById('tableBody');

        if(!data || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">No announcements available</td></tr>';
            return;
        }

        tableBody.innerHTML = data.map(row => {
            const date = new Date(row.created_at);
            const formattedDate = `${date.getMonth() +1}/${date.getDate()}/${date.getFullYear()}`;

            return `
            <tr>
                <td class="col-announce-date" data-label="Date">
                    ${formattedDate}
                </td>
                <td class="col-announce-type" data-label="Type">
                    ${row.type}
                </td>
                <td class="col-announce-posted" data-label="Posted By">
                    ${row.posted_by}
                </td>
                <td class="col-announce-text" data-label="Announcement">
                    ${row.announcement_text}
                </td>
            </tr>
            `;}).join('');
    } catch (error) {
        console.error('Error loading announcements:', error);
        document.getElementById('tableBody').innerHTML = 
        '<tr><td colspan="4">Error loading announcements</td></tr>';
    }
}

// USERS
async function editUsers() {
    try {
        const login_info = await getLogin();
        const chapter = login_info.chapter;
        
        let query = supabase
            .from('profiles')
            .select('*')
            .order('role', { ascending: false});

        if (chapter !=='SEIU Healthcare Pennsylvania') {
            query.eq('chapter', chapter);
        }

        const { data, error } = await query;

        if (error) throw error;

        const userTableBody = document.getElementById('userTableBody');

        if (!data || data.length === 0) {
            userTableBody = '<tr><td colspan="7" class="empty-state">No users found</td></tr>';
            return;
        }

        userTableBody.innerHTML = data.map(row => `
        <tr id="user-row-${row.id}">
            <td class="col-user-first" data-label="First Name">${row.first_name}</td>
            <td class="col-user-last" data-label="Last Name">${row.last_name}</td>
            <td class="col-user-email" data-label="Email">${row.email}</td>
            <td class="col-user-chapter" data-label="Chapter">${row.chapter}</td>
            <td class="col-user-role" data-label="Role">${row.role}</td>
            <td class="col-user-active" data-label="Active?">${row.active}</td>
            <td class="col-user-actions">
                <button class="btn-approve" data-id="${row.id}"> 
                    Approve
                    </button>
                <button class="btn-active" data-id="${row.id}" data-active="${row.active}"> 
                    ${row.active ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        </tr>
        `).join('');
        setupUserActions();

    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('userTableBody').innerHTML = 
            '<tr><td colspan="7">Error loading users</td></tr>';
    }
}

async function setupUserActions() {
    const tableBody = document.getElementById('userTableBody');
    tableBody.addEventListener('click', async (e) => {
      const target = e.target;

      if (target.classList.contains('btn-approve')) {
        const id = target.dataset.id;
        const confirmed = confirm('Approve this user as a member?');

        if (confirmed) {
          target.disabled = true;
          target.textContent = 'Approving...';
          await approveUser(id, target);
        }
      }

      if (e.target.classList.contains('btn-active')) {
          const id = target.dataset.id;
          const active = target.dataset.active;
          const action = (active === true || active === 'true' ) ? 'deactivate' : 'activate';
          const confirmed = confirm(`Are you sure you want to ${action} this users?`)

          if (confirmed) {
            target.disabled = true;
            const originalText = target.textContent;
            target.textContent = 'Updating...';

            try {
              await changeActive(id, active, target);
            } catch (error) {
              target.disabled = false;
              target.textContent = originalText;
              alert('Failed to update user status. Please try again.');
            }
          }
      }

      if (target.classList.contains('btn-admin')) {
          const id = target.dataset.id;
          const role = target.dataset.role;
          const action = role === 'admin' ? 'remove admin privileges from' : 'grant admin privileges to';
          const confirmed = confirm(`Are you sure you want to ${action} this user?`);
          
          if (confirmed) {
              target.disabled = true;
              target.textContent = 'Updating...';
              await changeAdmin(id, role, target);
          }
      }
    });
}

async function approveUser(id, buttonElement) {
    try {
        const { data, error: fetchError } = await supabase 
            .from('profiles')
            .select('role')
            .eq('id', id)
            .single();
        
        if (fetchError) throw fetchError;

        if (data.role !== 'non-member') {
            alert('User is already approved.')
        } 

        if (data.role === 'non-member') {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ role: 'member'})
                .eq('id', id);
            
            if (updateError) throw updateError;

            const row = buttonElement.closest('tr');
            const roleCell = row.cells[4];
            roleCell.textContent = 'member';
            buttonElement.editUsers = true;
            buttonElement.textContent = 'Approved';
        }
    } catch (error) {
        console.error('Error approving user:', error);
        alert('Failed to approve user. Please try again.');
    }
}

async function changeActive(id, currentActive, buttonElement) {
    try {
        const isActive = currentActive === true || currentActive==='true';
        const { error } = await supabase
            .from('profiles')
            .update({ active: !isActive })
            .eq('id', id)
        if (error) throw error;
    
        const row = buttonElement.closest('tr');
        const activeCell = row.cells[5];
        activeCell.textContent = !isActive;
        buttonElement.dataset.active = !isActive;
        buttonElement.textContent = !isActive ? 'Deactivate' : 'Activate';
        buttonElement.disabled = false;

    } catch (error) {
        console.error('Error changing active status:', error);
        alert('Failed to change active status. Please try again.');
        buttonElement.disabled = false;
        buttonElement.textContent = currentActive === 'true' || currentActive === true ? 'Deactivate' : 'Activate';
        throw error;
    }
}    

// CHAPTERS
async function loadChapters() {
    try {
        const { data, error } = await supabase
            .from('chapters')
            .select(`id, long_name`)
            .eq('active', true)
            .order('long_name');
        
        if (error) throw error;
        const selectElement = document.getElementById('selectChapter');

        selectElement.innerHTML = '<option value="">--Select a chapter --</option>' +
            data.map(row => `<option value="${row.long_name}">${row.long_name}</option>`).join('');
    } catch (error) {        
        console.error('Error loading chapters:', error);
        document.getElementById('selectChapter').innerHTML = 
                `<option value="">Error loading chapters</option>`;
    }
}

// Export functions
export {supabase};

window.getLogin = getLogin;
window.supabase = supabase;
window.loadAnnouncements = loadAnnouncements;
window.loadChapters = loadChapters;
window.editUsers = editUsers;
window.approveUser = approveUser;
window.changeActive = changeActive;
window.navMenu = navMenu;
window.signOut = signOut;
window.messaging = messaging;
window.app = app;
window.db = db;