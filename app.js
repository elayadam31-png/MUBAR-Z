import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

// Global variables provided by the Canvas environment
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const PUBLIC_CHAT_COLLECTION = `/artifacts/${appId}/public/data/messages`;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const App = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const signIn = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Firebase'də anonim daxil olarkən səhv baş verdi:", error);
      }
    };

    signIn();

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        console.log("İstifadəçi daxil oldu, UID:", currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, PUBLIC_CHAT_COLLECTION),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user) {
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, PUBLIC_CHAT_COLLECTION), {
        text: newMessage,
        uid: user.uid,
        displayName: `Anonim-${user.uid.substring(0, 5)}`,
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Mesaj göndərərkən səhv baş verdi:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      <header className="p-4 bg-gray-800 shadow-md flex items-center justify-between">
        <h1 className="text-2xl font-bold text-indigo-400">İctimai Mesajlaşma Otağı</h1>
        <div className="text-sm text-gray-400">
          İstifadəçi ID: <span className="font-mono text-xs">{user?.uid || 'Yüklənir...'}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg shadow-md flex flex-col ${
                msg.uid === user?.uid ? 'bg-indigo-600 self-end ml-auto' : 'bg-gray-700 self-start mr-auto'
              } max-w-xs`}
            >
              <span className="font-bold text-sm mb-1 text-gray-200">
                {msg.displayName}
              </span>
              <p className="text-sm break-words">{msg.text}</p>
              <span className="text-xs text-right mt-1 opacity-75">
                {msg.createdAt?.toDate().toLocaleTimeString('az-AZ') || 'Yüklənir...'}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <form onSubmit={handleSendMessage} className="p-4 bg-gray-800 shadow-lg flex items-center">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Mesajınızı daxil edin..."
          className="flex-1 p-3 rounded-l-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className={`p-3 text-white rounded-r-lg font-semibold transition-colors duration-200 ${
            loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'
          }`}
          disabled={loading}
        >
          {loading ? 'Göndərilir...' : 'Göndər'}
        </button>
      </form>
    </div>
  );
};

export default App;
