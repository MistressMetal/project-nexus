importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCLQ9bn3zp65FRhxat-QHcVnQfeiehjf3k",
    authDomain: "hcpa-project-nexus.firebaseapp.com",
    projectId: "hcpa-project-nexus",
    storageBucket: "hcpa-project-nexus.firebasestorage.app",
    messagingSenderId: "276730700584",
    appId: "1:276730700584:web:9b1047461ce72f3371e61d",
    measurementId: "G-V2VKZ8FHFV"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// This handles messages when the tab is INACTIVE or closed
messaging.onBackgroundMessage((payload) => {
    console.log('[Background] Received message', payload);
    
    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message'
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});