import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(reg => console.log('SW registered:', reg))
        .catch(err => console.error('SW registration failed:', err));
}
const firebaseConfig = {
    apiKey: "AIzaSyCLQ9bn3zp65FRhxat-QHcVnQfeiehjf3k",
    authDomain: "hcpa-project-nexus.firebaseapp.com",
    projectId: "hcpa-project-nexus",
    storageBucket: "hcpa-project-nexus.firebasestorage.app",
    messagingSenderId: "276730700584",
    appId: "1:276730700584:web:9b1047461ce72f3371e61d",
    measurementId: "G-V2VKZ8FHFV"
}

const app=initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

        // Register service worker
       if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                        console.log('Service Worker registered successfully:', registration.scope);
                    })
                    .catch((error) => {
                        console.log('Service Worker registration failed:', error);
                    });
            });
       }

  document.getElementById('getAnnouncementsButton').addEventListener('click', async () => {
    try {
        const announcementTypeFilterElement = document.getElementById('announcementTypeFilter');
        const announcementTypeFilterIndex = announcementTypeFilterElement.selectedIndex;
        const announcementTypeFilterOption = announcementTypeFilterElement.options[announcementTypeFilterIndex];
        const announcementTypeFilterText = announcementTypeFilterOption.text;
        const announcementList = document.getElementById('announcement-list');
        announcementList.innerHTML = '';

        if (announcementTypeFilterElement.value === 'all') {
            var querySnapshot = await getDocs(query(
                collection(db, 'announcements'), 
                orderBy('timestamp', 'desc')));
            

        }
        else {
        var querySnapshot = await getDocs(query(
            collection(db, 'announcements'), 
            orderBy('timestamp', 'desc'),
            where('announcementType', '==', announcementTypeFilterText)));
        }

        if (querySnapshot.empty) {
            announcementList.innerHTML = '<p>There are no announcements at this time.</p>';
            return;
        }
        const table = document.createElement('table');
        table.innerHTML = `
        <thead>
        <tr>
        <th>Type</th>
        <th>Announcement</th>
        <th>Posted By</th>
        <th>Date</th>
        </tr>
        </thead>
        <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');


        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const row=document.createElement('tr');
            const listItem = document.createElement('tr');
            row.innerHTML =`
            <td>${data.announcementType}</td>
            <td>${data.message}</td>
            <td>${data.postedBy}</td>
            <td>${data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : 'Unknown'}</td>
            `;
            tbody.appendChild(row);
        });
            announcementList.appendChild(table);
       
    } catch (error) {
        console.error('Error getting announcements:', error);
        document.getElementById('announcement-list').innerHTML = `<p style="color: red;">Error loading announcements: ${error.message}</p>`;
    }
});

  
    async function getAnnouncements() {
        try {
            const querySnapshot = await getDocs(collection(db, 'announcements'));
            const announcementList = document.getElementById('announcement-list');
            announcementList.innerHTML = '';
    
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const listItem = document.createElement('li');
                listItem.textContent = data.message;
                announcementList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error getting announcements:', error);
        }
    }
    
    // Handle foreground messages
    onMessage(messaging, (payload) => {
        console.log('🔔 Message received:', payload);
        alert(`${payload.notification.title}: ${payload.notification.body}`);
    });
    
    async function waitForServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.ready;
                console.log('Service worker is ready');
                return true;
            } catch (err) {
                console.error('Service worker not available:', err);
                return false;
            }
        }
        return false;
    }
    
    // Modified requestPermission
    async function requestPermission() {
        try {
            // Wait for service worker first
            const swReady = await waitForServiceWorker();
            if (!swReady) {
                alert('Service worker not ready. Please refresh the page.');
                return;
            }
            
            const permission = await Notification.requestPermission();
            console.log('Permission:', permission);
            
            if (permission === 'granted') {
                console.log('Getting token...');
                
                const token = await getToken(messaging, {
                    vapidKey: "BPeFoXdfW_5QKbCm9XLAaZYBrNQHudWuyv_-UvY75Yq2DAU2gYm6qu47q8AMWEW_hmtw2MPn83VQUOgJpjF4Yas",
                });
            
                if (token) {
                    console.log('Token:', token);
                    document.getElementById('token').textContent = token;
                    
                    // Save to database
                    await addDoc(collection(db, "fcmTokens"), {
                        token: token,
                        createdAt: new Date()
                    });
                }
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error getting token: ' + err.message);
        }
    }
    
    document.getElementById('requestToken')?.addEventListener('click', requestPermission);
    
    
    
    console.log('[SW] Firebase messaging service worker loaded');
    

export {app};
export {db};

// Expose functions to the global scope
window.getAnnouncements = getAnnouncements;
window.messaging = getMessaging(app);

//window.requestPermission = requestPermission;

