import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc, getDocs, collection, query, where, orderBy } from "firebase/firestore";
import Navbar from "./Navbar";

function FinancialHealth({ user, onBack, onSignOut, onNavigate }) {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [accountData, setAccountData] = useState(null);
  const [billHistory, setBillHistory] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [totalDebt, setTotalDebt] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const accountSnap = await getDoc(doc(db, "accountInfo", user.uid));
        if (accountSnap.exists()) setAccountData(accountSnap.data());

        const q = query(
          collection(db, "billHistory"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        setBillHistory(snapshot.docs.map((d) => d.data()));
        setDataLoaded(true);
      } catch (err) {
        console.error("Load error:", err);
        setDataLoaded(true);
      }
    };
    loadData();
  }, [user.uid]);

  const parseAnalysis = (text) => {
    const extract = (label, nextLabels) => {
      const pattern = new RegExp(
        `${label}:?\\s*([\\s\\S]*?)(?=${nextLabels.map(l => `${l}:`).join("|")}|$)`,
        "i"
      );
      const match = text.match(pattern);
      return match ? match[1].trim() : null;
    };

    const riskMatch = text.match(/RISK LEVEL:\s*([A-Z]+)/i);
    const debtStrategyRaw = extract("DEBT STRATEGY", ["BOTTOM LINE"]);

    const recommendedMatch = debtStrategyRaw?.match(/RECOMMENDED:\s*([^\n]+)/i);
    const whyMatch = debtStrategyRaw?.match(/WHY:\s*([\s\S]*?)(?=STEPS:|GOAL:|$)/i);
    const stepsMatch = debtStrategyRaw?.match(/STEPS:\s*([\s\S]*?)(?=GOAL:|$)/i);
    const goalMatch = debtStrategyRaw?.match(/GOAL:\s*([\s\S]*?)$/i);

    const stepsRaw = stepsMatch ? stepsMatch[1].trim() : "";
    const steps = stepsRaw
      .split("\n")
      .map(line => line.replace(/^[-•*]\s*/, "").replace(/^step\s*\d+:\s*/i, "").trim())
      .filter(line => line.length > 0);

    return {
      riskLevel: riskMatch ? riskMatch[1].toUpperCase() : null,
      overview: extract("OVERVIEW", ["KEY CONCERNS", "POSITIVE SIGNS", "RECOMMENDATIONS", "DEBT STRATEGY", "BOTTOM LINE"]),
      keyConcerns: extract("KEY CONCERNS", ["POSITIVE SIGNS", "RECOMMENDATIONS", "DEBT STRATEGY", "BOTTOM LINE"]),
      positiveSigns: extract("POSITIVE SIGNS", ["RECOMMENDATIONS", "DEBT STRATEGY", "BOTTOM LINE"]),
      recommendations: extract("RECOMMENDATIONS", ["DEBT STRATEGY", "BOTTOM LINE"]),

      debtStrategy: {
        recommended: recommendedMatch ? recommendedMatch[1].trim() : null,
        why: whyMatch ? whyMatch[1].trim() : null,
        steps: steps,
        goal: goalMatch ? goalMatch[1].trim() : null,
      },
      bottomLine: extract("BOTTOM LINE", []),
    };
  };

  const getRiskColor = (level) => {
    switch (level) {
      case "LOW": return { bg: "#f0fff4", border: "#9ae6b4", text: "#276749", badge: "#38a169" };
      case "MODERATE": return { bg: "#fffbeb", border: "#f6e05e", text: "#744210", badge: "#d69e2e" };
      case "HIGH": return { bg: "#fff5f5", border: "#feb2b2", text: "#742a2a", badge: "#e53e3e" };
      case "CRITICAL": return { bg: "#fff5f5", border: "#fc8181", text: "#63171b", badge: "#9b2c2c" };
      default: return { bg: "#f7fafc", border: "#e2e8f0", text: "#2d3748", badge: "#4a5568" };
    }
  };

  const getRiskEmoji = (level) => {
    switch (level) {
      case "LOW": return "✅";
      case "MODERATE": return "⚠️";
      case "HIGH": return "🚨";
      case "CRITICAL": return "🔴";
      default: return "📊";
    }
  };

  const parseBullets = (text) => {
    if (!text) return [];
    return text
      .split("\n")
      .map(line => line.replace(/^[-•*]\s*/, "").trim())
      .filter(line => line.length > 0);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis(null);

    try {
      const a = accountData || {};
      const income = parseFloat(a.thisMonthIncome) || parseFloat(a.avgMonthlyIncome) || 0;
      const totalFixed = [a.rent, a.utilities, a.insurance, a.subscriptions, a.otherFixed]
        .map(v => parseFloat(v) || 0).reduce((acc, v) => acc + v, 0);
      const totalVariable = [a.groceries, a.transportation, a.eatingOut, a.shopping, a.entertainment, a.otherVariable]
        .map(v => parseFloat(v) || 0).reduce((acc, v) => acc + v, 0);
      const debtPayment = parseFloat(a.monthlyDebtPayment) || 0;
      const totalDebt = parseFloat(a.totalDebt) || 0;
      setTotalDebt(totalDebt);
      const totalExpenses = totalFixed + totalVariable + debtPayment;
      const remaining = income - totalExpenses;
      const dti = income > 0 ? ((debtPayment / income) * 100).toFixed(1) : "N/A";

      const billSummaries = billHistory.slice(0, 5).map((b, i) =>
        `Bill ${i + 1} (${b.fileName}):\n${b.summary?.slice(0, 500) || "No summary"}`
      ).join("\n\n");

      const prompt = `
You are a financial health advisor. Analyze the following user's financial situation.

=== DEMOGRAPHICS ===
Age: ${a.age || "Not provided"}
Occupation: ${a.occupation || "Not provided"}
Employment Status: ${a.employmentStatus || "Not provided"}
Marital Status: ${a.maritalStatus || "Not provided"}
Head of Household: ${a.householdHead || "Not provided"}
Household Size: ${a.householdSize || "Not provided"}
Dependents: ${a.dependents || "Not provided"}
Housing Status: ${a.housingStatus || "Not provided"}
Education Level: ${a.educationLevel || "Not provided"}
Health Insurance: ${a.healthInsurance || "Not provided"}

=== FINANCIAL DATA ===
Monthly Income: $${income.toFixed(2)}
Fixed Expenses: $${totalFixed.toFixed(2)}
Variable Spending: $${totalVariable.toFixed(2)}
Total Debt: $${totalDebt.toFixed(2)}
Monthly Debt Payment: $${debtPayment.toFixed(2)}
DTI Ratio: ${dti}%
Total Expenses: $${totalExpenses.toFixed(2)}
Remaining After Expenses: $${remaining.toFixed(2)}

=== RECENT BILLS ===
${billSummaries || "No bill history available."}

=== YOUR TASK ===
Provide a structured financial health analysis. Use EXACTLY this format with these exact labels:

RISK LEVEL: [LOW / MODERATE / HIGH / CRITICAL]

OVERVIEW:
2-3 sentences summarizing their financial situation considering their demographics.

KEY CONCERNS:
- One concern per line starting with -
- Be specific with numbers
- Reference demographics where relevant

POSITIVE SIGNS:
- One positive per line starting with -

RECOMMENDATIONS:
- One recommendation per line starting with -
- Make each one specific and actionable
- Tailor to their demographic situation

DEBT STRATEGY:
${totalDebt > 0 ? 
`Based on their total debt of $${totalDebt.toFixed(2)}, monthly debt payment of $${debtPayment.toFixed(2)}, monthly income of $${income.toFixed(2)}, and remaining budget of $${remaining.toFixed(2)}, recommend ONE of these strategies:
- Avalanche Method (highest interest first)
- Snowball Method (lowest balance first)
- Debt Consolidation Loan
- Balance Transfer Credit Card

Follow this exact format:

RECOMMENDED: [strategy name]

WHY: 2 sentences explaining exactly why this strategy fits their specific income, debt amount, and demographic situation.

STEPS:
- Step 1: [specific first action with dollar amounts where possible]
- Step 2: [specific second action]
- Step 3: [specific third action]
- Step 4: [specific fourth action]
- Step 5: [specific fifth action]

GOAL: One sentence stating what they will achieve and approximately when if they follow this plan.`
:
`This user has no debt. Instead of a debt strategy, provide savings and wealth building advice.

Follow this exact format:

RECOMMENDED: No Debt Strategy Needed

WHY: 2 sentences congratulating them and explaining the opportunity they have without debt obligations.

STEPS:
- Step 1: [specific savings or investment action with dollar amounts]
- Step 2: [specific second action]
- Step 3: [specific third action]
- Step 4: [specific fourth action]
- Step 5: [specific fifth action]

GOAL: One sentence stating what they can achieve financially by following this savings plan. `}
      `;

      const response = await fetch(`${API_URL}/analyze/health`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      const rawText = data.analysis || "";
      setAnalysis(parseAnalysis(rawText));

    } catch (err) {
      console.error("Analysis error:", err);
      setAnalysis({ error: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const colors = analysis?.riskLevel ? getRiskColor(analysis.riskLevel) : null;

  return (
    <div className="clarity-app">
      <Navbar user={user} onSignOut={onSignOut} onNavigate={onNavigate} />

      <div className="health-container">
        <div className="account-header">
          <h2>💊 Financial Health Check</h2>
        </div>

        {/* data summary cards*/}
        <div className="health-data-cards">
          {[
            {
              label: "Monthly Income",
              value: accountData
                ? `$${(parseFloat(accountData.thisMonthIncome) || parseFloat(accountData.avgMonthlyIncome) || 0).toLocaleString()}`
                : "Not set"
            },
            {
              label: "Total Debt",
              value: accountData
                ? `$${(parseFloat(accountData.totalDebt) || 0).toLocaleString()}`
                : "Not set"
            },
            {
              label: "Bills Analyzed",
              value: billHistory.length
            },
            {
              label: "DTI Ratio",
              value: accountData && (parseFloat(accountData.thisMonthIncome) || parseFloat(accountData.avgMonthlyIncome))
                ? `${(((parseFloat(accountData.monthlyDebtPayment) || 0) /
                    (parseFloat(accountData.thisMonthIncome) || parseFloat(accountData.avgMonthlyIncome))) * 100).toFixed(1)}%`
                : "N/A"
            },
          ].map(({ label, value }) => (
            <div key={label} className="health-data-card">
              <p className="health-card-label">{label}</p>
              <p className="health-card-value">{value}</p>
            </div>
          ))}
        </div>

        {/* warning */}
        {dataLoaded && !accountData && (
          <div className="health-warning">
            ⚠️ No account info found. Fill in your Account Info for a more accurate analysis.
          </div>
        )}

        {/* analyze */}
        <button className="analyze-btn" onClick={handleAnalyze} disabled={loading}>
          {loading ? "⏳ Analyzing your finances..." : "🔍 Run Financial Health Check"}
        </button>

        {/* error*/}
        {analysis?.error && (
          <div className="health-warning">{analysis.error}</div>
        )}

        {/* Results */}
        {analysis && !analysis.error && (
          <div className="health-results-wrapper">

            {/* risk badge */}
            <div className="health-risk-badge" style={{
              backgroundColor: colors.bg,
              border: `2px solid ${colors.border}`,
              color: colors.text
            }}>
              <span className="health-risk-emoji">{getRiskEmoji(analysis.riskLevel)}</span>
              <div>
                <p className="health-risk-label">Financial Risk Level</p>
                <p className="health-risk-level" style={{ color: colors.badge }}>
                  {analysis.riskLevel}
                </p>
              </div>
            </div>

            {/* Overview */}
            {analysis.overview && (
              <div className="health-card">
                <div className="health-card-title">📋 Overview</div>
                <p className="health-card-text">{analysis.overview}</p>
              </div>
            )}

            <div className="health-two-col">

              {/* Key Concerns */}
              {analysis.keyConcerns && (
                <div className="health-card health-card-red">
                  <div className="health-card-title">⚠️ Key Concerns</div>
                  <ul className="health-bullet-list">
                    {parseBullets(analysis.keyConcerns).map((item, i) => (
                      <li key={i} className="health-bullet-item health-bullet-red">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Positive signs */}
              {analysis.positiveSigns && (
                <div className="health-card health-card-green">
                  <div className="health-card-title">✅ Positive Signs</div>
                  <ul className="health-bullet-list">
                    {parseBullets(analysis.positiveSigns).map((item, i) => (
                      <li key={i} className="health-bullet-item health-bullet-green">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

            {/* Recommendations */}
            {analysis.recommendations && (
              <div className="health-card health-card-blue">
                <div className="health-card-title">💡 Recommendations</div>
                <div className="health-rec-list">
                  {parseBullets(analysis.recommendations).map((item, i) => (
                    <div key={i} className="health-rec-item">
                      <span className="health-rec-number">{i + 1}</span>
                      <p className="health-rec-text">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debt strategy */}
            {analysis.debtStrategy?.recommended && (
              <div className="health-card health-card-purple">
                <div className="health-card-title">
                  {totalDebt > 0 ? "💳 Recommended Debt Strategy" : "💰 Savings & Wealth Building"}
                </div>

                {/* Strategy Pills */}
                <div className="health-strategy-pills">
                  {totalDebt > 0 ? (
                    ["Avalanche Method", "Snowball Method", "Debt Consolidation Loan", "Balance Transfer Credit Card"].map((s) => (
                      <span
                        key={s}
                        className={`health-strategy-pill ${
                          analysis.debtStrategy.recommended?.toLowerCase().includes(s.toLowerCase().split(" ")[0])
                          ? "health-strategy-pill-active"
                          : ""
                        }`}
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="health-strategy-pill health-strategy-pill-active">
                      💰 Focus on Savings & Wealth Building
                    </span>
                  )}
                </div>

                {/* why */}
                {analysis.debtStrategy.why && (
                  <div className="debt-strategy-why">
                    <p className="debt-strategy-section-label">Why this fits you</p>
                    <p className="health-card-text">{analysis.debtStrategy.why}</p>
                  </div>
                )}

                {/* steps */}
                {analysis.debtStrategy.steps.length > 0 && (
                    <div className="debt-strategy-steps">
                    <p className="debt-strategy-section-label">Your Step-by-Step Plan</p>
                    {analysis.debtStrategy.steps.map((step, i) => (
                      <div key={i} className="debt-strategy-step">
                        <div className="debt-strategy-step-number">{i + 1}</div>
                        <div className="debt-strategy-step-content">
                          <p>{step.replace(/^step\s*\d+:\s*/i, "")}</p>
                        </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Goal */}
                {analysis.debtStrategy.goal && (
                  <div className="debt-strategy-goal">
                    <span className="debt-strategy-goal-icon">🎯</span>
                    <p>{analysis.debtStrategy.goal}</p>
                    </div>
                  )}

               </div>
            )}

            {/* Bottom line */}
            {analysis.bottomLine && (
              <div className="health-bottom-line" style={{
                backgroundColor: colors.bg,
                border: `2px solid ${colors.border}`,
              }}>
                <p className="health-bottom-line-label">Bottom Line</p>
                <p className="health-bottom-line-text" style={{ color: colors.text }}>
                  {analysis.bottomLine}
                </p>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

export default FinancialHealth;