import React, { useState, useEffect } from "react";
import axios from "axios";
import { auth, provider, signInWithPopup, signOut } from "./firebase";
import { db } from "./firebase";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

import logo from './logo.svg';
import './App.css';
import AccountInfo from "./AccountInfo";
import FinancialHealth from "./FinancialHealth";
import Navbar from "./Navbar";

function App() {
  const [text, setText] = useState("")
  const [summary, setSummary] = useState("")
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState('text')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [dueDates, setDueDates] = useState([]);
  const [showExpensePrompt, setShowExpensePrompt] = useState(false);
  const [detectedAmount, setDetectedAmount] = useState(null);
  //history
  const [historyList, setHistoryList] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  //acount info
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  //financial health
  const [showFinancialHealth, setShowFinancialHealth] = useState(false);

  //navbar
  const handleNavigate = async (page) => {
    setShowHistory(false);
    setShowAccountInfo(false);
    setShowFinancialHealth(false);
    setSelectedItem(null);

    if (page === "history") {
      await fetchHistory();
      setShowHistory(true);
    } else if (page === "account") {
      setShowAccountInfo(true);
    } else if (page === "health") {
      setShowFinancialHealth(true);
    }
  };
  

  // Sign in
  useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
    setUser(currentUser);
    if (currentUser) {
      try {
        const q = query(
          collection(db, "billHistory"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHistoryList(items);

        //due dates
        const accountDocRef = doc(db, "accountInfo", currentUser.uid);
        const accountSnap = await getDoc(accountDocRef);
        if (accountSnap.exists()) {
          setDueDates(accountSnap.data().dueDates || []);
        }

      } catch (err) {
        console.error("History fetch error:", err);
      }
    }
  });
  return () => unsubscribe();
}, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (err) {
      console.error("Sign-in error:", err);
      alert("Failed to sign in with Google");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setSummary("");
      setFile(null);
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  };

  //fetch history
  const fetchHistory = async () => {
    try {
      console.log("Fetching history for user:", auth.currentUser.uid);

      const q = query(
        collection(db, "billHistory"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      console.log("Number of docs found:", snapshot.docs.length);

      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        };
      });

      setHistoryList(items);
    } catch (err) {
      console.error("History error:", err.message);
    }
  };

  //delete history
  const handleDelete = async (itemId) => {
    const confirmed = window.confirm("Are you sure you want to delete this bill summary? This cannot be undone.");
  
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "billHistory", itemId));
      setHistoryList((prev) => prev.filter((item) => item.id !== itemId));
      if (selectedItem?.id === itemId) setSelectedItem(null);
      console.log("Deleted:", itemId);
    } catch (err) {
      console.error("Delete error:", err.message);
      alert("Failed to delete. Please try again.");
    }
  };

  //add total to expenses
  const handleAddToExpenses = async () => {
  try {
    const docRef = doc(db, "accountInfo", user.uid);
    const docSnap = await getDoc(docRef);
    const existing = docSnap.exists() ? docSnap.data() : {};
    const currentOtherFixed = parseFloat(existing.otherFixed) || 0;

    await setDoc(docRef, {
      ...existing,
      otherFixed: (currentOtherFixed + detectedAmount).toFixed(2),
    });

    alert(`✅ $${detectedAmount.toFixed(2)} added to your monthly expenses in 'other fixed expenses'!`);
  } catch (err) {
    console.error("Failed to update expenses:", err);
  } finally {
    setShowExpensePrompt(false);
    setDetectedAmount(null);
  }
};

  const parseSummary = (text) => {
    const sections = {
      total: "",
      dueDate: "",
      keyCharges: "",
      unusual: "",
      graphs: "",
      summary: ""
    };
    

    const lines = text.split("\n");
    let currentSection = "";

    lines.forEach(line => {
      const clean = line.trim().toLowerCase();

      if (clean.includes("total amount due")) {
        currentSection = "total";
      } else if (clean.includes("due date")) {
        currentSection = "dueDate";
      } else if (clean.includes("key charges")) {
        currentSection = "keyCharges";
      } else if (clean.includes("unusual or high charges")) {
        currentSection = "unusual";
      } else if (clean.includes("analysis of graphs")) {
        currentSection = "graphs";
      } else if (clean.includes("summary")) {
        currentSection = "summary";
      } else if (clean !== "") {
        sections[currentSection] += line + "\n";
      }
    });

    return sections;
  };

  const formatBullets = (text) => {
    if (!text) return [];

    return text
      .split("-")
      .map(item => item.trim())
      .filter(item => item.length > 0);
    };

  //Summarizing
  const handleSummarize = async () => {
    const parseSummaryFields = (summaryText) => {
      const amountMatch = summaryText.match(
        /Total\s+[Aa]mount\s+[Dd]ue\s*:\s*\$?([\d,]+\.?\d*)/i
      );
      const dateMatch = summaryText.match(
        /Due\s+[Dd]ate\s*:\s*([^\n]+)/i
      );

      const amount = amountMatch
        ? parseFloat(amountMatch[1].replace(/,/g, ""))
        : null;
      const dueDate = dateMatch ? dateMatch[1].trim() : null;

      return { amount, dueDate };
    };
  if (mode === "pdf" || mode === "image") {
    if (!file) {
      alert(`Please upload a ${mode.toUpperCase()} file`);
      return;
    }
  }

  setLoading(true);
  setSummary("");

  try {
    const formData = new FormData();
    formData.append("file", file);

    const url = mode === "pdf"
      ? "http://localhost:5000/summarize/pdf"
      : "http://localhost:5000/summarize/image";

    const res = await axios.post(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (res && res.data.summary) {
      const newSummary = res.data.summary;
      const parsedSummary = parseSummary(newSummary);

      setSummary(String(newSummary));
      setLoading(false);

      // Parse amount and due date from summary
      const { amount, dueDate } = parseSummaryFields(newSummary);
        if (amount) {
            setDetectedAmount(amount);
            setShowExpensePrompt(true);
        }

    if (dueDate) {
    try {
      const docRef = doc(db, "accountInfo", user.uid);
      const docSnap = await getDoc(docRef);
      const existing = docSnap.exists() ? docSnap.data() : {};
      const currentDueDates = existing.dueDates || [];

      const newDueDate = {
        id: Date.now().toString(),
        fileName: file.name,
        dueDate: dueDate,
        amount: amount ? `$${amount.toFixed(2)}` : "Not provided",
        addedAt: new Date().toISOString(),
      };

      await setDoc(docRef, {
        ...existing,
        dueDates: [...currentDueDates, newDueDate],
      });

      setDueDates((prev) => [...prev, newDueDate]); 
    } catch (err) {
      console.error("Failed to save due date:", err);
    }
  }
      try {
        console.log("Attempting to save to Firestore...");
        const docRef = await addDoc(collection(db, "billHistory"), {
          userId: user.uid,
          summary: newSummary,
          fileName: file.name,
          createdAt: serverTimestamp(),
        });
        console.log("Saved successfully! Doc ID:", docRef.id);

        const newEntry = {
          id: Date.now().toString(),
          userId: user.uid,
          summary: newSummary,
          fileName: file.name,
          createdAt: new Date(),
        };
        setHistoryList((prev) => [newEntry, ...prev]);

      } catch (firestoreErr) {
        console.error("Firestore save error:", firestoreErr.message);
      }
    }

  } catch (err) {
    console.error(err);
    if (err.response?.data?.error) {
      alert(`Error: ${err.response.data.error}`);
    } else {
      alert("Something went wrong while summarizing");
    }
  } finally {
    setLoading(false);
  }
};

  //not signed in
  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>📄 Bill Summarizer</h1>
          <p>Upload bills. Get instant insights.</p>

          <button className="google-btn" onClick={handleGoogleSignIn}>
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="google"
            />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }
  
  //financial health
  if (showFinancialHealth) {
  return (
    <FinancialHealth
      user={user}
      onBack={() => setShowFinancialHealth(false)}
      onSignOut={handleSignOut}        
      onNavigate={handleNavigate}      
    />
  );
  }

  //history section
  if (showHistory) {
  return (
    <div className="clarity-app">
      <Navbar user={user} onSignOut={handleSignOut} onNavigate={handleNavigate} />
      <div className="history-container">
        <h2>Your History</h2>
          {historyList.length === 0 && (
        <p className="no-history">No history yet. Summarize a bill to get started!</p>
      )}

      {historyList.map((item) => (
        <div key={item.id}>

          <div
            className={`history-item ${selectedItem?.id === item.id ? "active" : ""}`}
            onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
          >
            <div className="history-item-info">
              <p><strong>📄 {item.fileName}</strong></p>
              <p className="history-date">
                {item.createdAt instanceof Date ? item.createdAt.toLocaleString(): "No date"}
              </p>
            </div>

            

            <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
              >
                🗑
              </button>
          </div>

          {selectedItem?.id === item.id && (
            <div className="history-detail">
              <div className="history-detail-header">
                <h3>Summary</h3>
              </div>
              <div className="history-detail-footer"> 
                <button
                  className="close-btn"
                  onClick={() => setSelectedItem(null)}
                >
                  ✕ Close
                </button>
              </div>
              <p>{selectedItem.summary}</p>
            </div>
          )}

        </div>
      ))}
    </div>
  </div>
  );
}

if (showAccountInfo) {
    return (
    <AccountInfo
      user={user}
      onBack={() => setShowAccountInfo(false)}
      onSignOut={handleSignOut}      
      onNavigate={handleNavigate}      
    />
  );
}
//delete due date
const handleDeleteDueDate = async (id) => {
  const confirmed = window.confirm("Remove this due date from your list?");
  if (!confirmed) return;

  try {
    const docRef = doc(db, "accountInfo", user.uid);
    const docSnap = await getDoc(docRef);
    const existing = docSnap.exists() ? docSnap.data() : {};
    const updatedDates = (existing.dueDates || []).filter((d) => d.id !== id);

    await setDoc(docRef, { ...existing, dueDates: updatedDates });
    setDueDates((prev) => prev.filter((d) => d.id !== id));
  } catch (err) {
    console.error("Failed to delete due date:", err);
  }
};
  //signed in
  return (
  <div className="clarity-app">

    {/* navbar */}
    <Navbar user={user} onSignOut={handleSignOut} onNavigate={handleNavigate} />
    
    {/* hero */}
    <div className="clarity-hero">
      <p className="clarity-welcome">Welcome, {user.displayName}</p>
      <h1 className="clarity-headline">Summarize Your Bills Now</h1>
      <div className="clarity-upload-btns">
        <button
          className={`upload-btn ${mode === "pdf" ? "upload-btn-active" : ""}`}
          onClick={() => { setMode("pdf"); setFile(null); }}
        >
          Upload PDF
        </button>
        <button
          className={`upload-btn ${mode === "image" ? "upload-btn-active" : ""}`}
          onClick={() => { setMode("image"); setFile(null); }}
        >
          Upload Image
        </button>
      </div>

      {mode === "pdf" && (
        <input type="file" accept="application/pdf"
          className="clarity-file-input"
          onChange={(e) => setFile(e.target.files[0])} />
      )}
      {mode === "image" && (
        <input type="file" accept="image/*"
          className="clarity-file-input"
          onChange={(e) => setFile(e.target.files[0])} />
      )}

      {file && (
        <button className="clarity-summarize-btn" onClick={handleSummarize} disabled={loading}>
          {loading ? "⏳ Analyzing your bill..." : "Summarize"}
        </button>
      )}
    </div>

    {/* due dates */}
    <div className="clarity-section">
      <h2 className="clarity-section-title">Due Dates</h2>

      {dueDates.length === 0 ? (
        <p className="clarity-empty">No upcoming due dates yet.</p>
      ) : (
        dueDates.map((item) => (
          <div key={item.id} className="due-date-card">
            <div className="due-date-card-thumb" />
            <div className="due-date-card-info">
              <p className="due-date-card-name">{item.fileName}</p>
              <p className="due-date-card-meta">Due: {item.dueDate}</p>
              <p className="due-date-card-meta">Amount: {item.amount}</p>
            </div>
            <button className="due-date-trash" onClick={() => handleDeleteDueDate(item.id)}>🗑</button>
          </div>
        ))
      )}
    </div>

    {/* summary */}
    {summary && (
      <div className="clarity-section">
        <h2 className="clarity-section-title">Here is what we summarized</h2>
        <div className="clarity-summary-layout">

          {/*left side*/}
          <div className="clarity-summary-left">
            {[
              "Total Amount Due",
              "Due Date",
              "Key Charges",
              "Unusual or High Charges",
              "Analysis of Graphs",
            ].map((label) => {
              const regex = new RegExp(`-?\\s*${label}:([\\s\\S]*?)(?=\\n\\s*-?\\s*(?:Total Amount Due|Due Date|Key Charges|Unusual or High Charges|Analysis of Graphs|Summary):|$)`, "i");
              const match = summary.match(regex);
              const content = match ? match[1].trim() : "Not provided";

              return (
                <div key={label} className="clarity-summary-section">
                  <div className="clarity-summary-row">
                    <span className="clarity-summary-dot" />
                    <span className="clarity-summary-label">{label}:</span>
                  </div>
                  <div className="clarity-summary-content">
                    {content.split("\n").filter(l => l.trim()).map((line, i) => (
                      <p key={i} className="clarity-summary-line">
                        {line.replace(/^[-•]\s*/, "")}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* right side*/}
          <div className="clarity-summary-right">
            {showExpensePrompt && detectedAmount && (
              <div className="clarity-expense-prompt">
                <p>Would you like to add your Total Amount Due of <strong>${detectedAmount.toFixed(2)}</strong> to your monthly expenses in Account Info?</p>
                <div className="clarity-expense-btns">
                  <button className="expense-yes-btn" onClick={handleAddToExpenses}>Yes</button>
                  <button className="expense-no-btn" onClick={() => setShowExpensePrompt(false)}>No</button>
                </div>
              </div>
            )}
            <div className="clarity-summary-box">
              <p className="clarity-summary-box-label">Summary:</p>
              <p className="clarity-summary-box-text">
                {(() => {
                  const match = summary.match(/-?\s*Summary:([\s\S]*?)$/i);
                  return match ? match[1].trim() : summary;
                })()}
              </p>
            </div>
          </div>

        </div>
      </div>
    )}
      </div>
  );
}

export default App;
