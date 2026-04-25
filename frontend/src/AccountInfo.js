import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

import Navbar from "./Navbar";

function AccountInfo({ user, onBack, onSignOut, onNavigate }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Demographics
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [householdHead, setHouseholdHead] = useState("");
  const [dependents, setDependents] = useState("");
  const [householdSize, setHouseholdSize] = useState("");
  const [housingStatus, setHousingStatus] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [healthInsurance, setHealthInsurance] = useState("");
  
  // Income
  const [avgMonthlyIncome, setAvgMonthlyIncome] = useState("");
  const [thisMonthIncome, setThisMonthIncome] = useState("");

  // Fixed expenses
  const [rent, setRent] = useState("");
  const [utilities, setUtilities] = useState("");
  const [insurance, setInsurance] = useState("");
  const [subscriptions, setSubscriptions] = useState("");
  const [otherFixed, setOtherFixed] = useState("");

  // Variable spending
  const [groceries, setGroceries] = useState("");
  const [transportation, setTransportation] = useState("");
  const [eatingOut, setEatingOut] = useState("");
  const [shopping, setShopping] = useState("");
  const [entertainment, setEntertainment] = useState("");
  const [otherVariable, setOtherVariable] = useState("");

  // Debt
  const [totalDebt, setTotalDebt] = useState("");
  const [monthlyDebtPayment, setMonthlyDebtPayment] = useState("");

  // Load saved data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const docRef = doc(db, "accountInfo", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const d = docSnap.data();
          setAge(d.age || "");
          setOccupation(d.occupation || "");
          setEmploymentStatus(d.employmentStatus || "");
          setHouseholdHead(d.householdHead || "");
          setDependents(d.dependents || "");
          setHouseholdSize(d.householdSize || "");
          setHousingStatus(d.housingStatus || "");
          setEducationLevel(d.educationLevel || "");
          setMaritalStatus(d.maritalStatus || "");
          setHealthInsurance(d.healthInsurance || "");
          setAvgMonthlyIncome(d.avgMonthlyIncome || "");
          setThisMonthIncome(d.thisMonthIncome || "");
          setRent(d.rent || "");
          setUtilities(d.utilities || "");
          setInsurance(d.insurance || "");
          setSubscriptions(d.subscriptions || "");
          setOtherFixed(d.otherFixed || "");
          setGroceries(d.groceries || "");
          setTransportation(d.transportation || "");
          setEatingOut(d.eatingOut || "");
          setShopping(d.shopping || "");
          setEntertainment(d.entertainment || "");
          setOtherVariable(d.otherVariable || "");
          setTotalDebt(d.totalDebt || "");
          setMonthlyDebtPayment(d.monthlyDebtPayment || "");
        }
      } catch (err) {
        console.error("Load error:", err);
      }
    };
    loadData();
  }, [user.uid]);

  // Calculations
  const income = parseFloat(thisMonthIncome) || parseFloat(avgMonthlyIncome) || 0;
  const totalFixed =
    [rent, utilities, insurance, subscriptions, otherFixed]
      .map((v) => parseFloat(v) || 0)
      .reduce((a, b) => a + b, 0);
  const totalVariable =
    [groceries, transportation, eatingOut, shopping, entertainment, otherVariable]
      .map((v) => parseFloat(v) || 0)
      .reduce((a, b) => a + b, 0);
  const totalExpenses = totalFixed + totalVariable;
  const debtPayment = parseFloat(monthlyDebtPayment) || 0;
  const dti = income > 0 ? ((debtPayment / income) * 100).toFixed(1) : null;
  const remaining = income - totalExpenses - debtPayment;

  const getDTIColor = () => {
    if (!dti) return "#4a5568";
    if (dti < 20) return "#38a169";
    if (dti < 36) return "#d69e2e";
    return "#e53e3e";
  };

  const getDTILabel = () => {
    if (!dti) return "";
    if (dti < 20) return "✅ Healthy";
    if (dti < 36) return "⚠️ Moderate";
    return "❌ High — consider seeking help";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "accountInfo", user.uid), {
        avgMonthlyIncome, thisMonthIncome,
        rent, utilities, insurance, subscriptions, otherFixed,
        groceries, transportation, eatingOut, shopping, entertainment, otherVariable,
        totalDebt, monthlyDebtPayment, age, occupation, employmentStatus, householdHead,
        dependents, householdSize, housingStatus,
        educationLevel, maritalStatus, healthInsurance,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="clarity-app">
      <Navbar user={user} onSignOut={onSignOut} onNavigate={onNavigate} />
    <div className="account-container">

      {/* Header */}
        <div className="account-header">
            <h2>Account Info</h2>
          </div>
          {/* Demographics */}
            <div className="account-section">
            <h3>👤 Demographics</h3>
            <p className="section-desc">
              This information helps us give you more personalized financial insights.
            </p>

            {/* Age */}
            <div className="input-group">
            <label>Age</label>
              <input
                type="number"
                placeholder="e.g. 28"
                className="demo-input"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
          </div>

        {/* Occupation */}
          <div className="input-group">
            <label>Occupation</label>
            <input
              type="text"
              placeholder="e.g. Teacher, Engineer, Nurse"
              className="demo-input"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            />
          </div>

        {/* Employment Status */}
          <div className="input-group">
            <label>Employment Status</label>
            <select
                className="demo-select"
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
              >
              <option value="">Select...</option>
              <option value="Full-time">Full-time Employed</option>
              <option value="Part-time">Part-time Employed</option>
              <option value="Self-employed">Self-employed / Freelance</option>
              <option value="Unemployed">Unemployed</option>
              <option value="Student">Student</option>
              <option value="Retired">Retired</option>
              <option value="Unable to work">Unable to Work</option>
            </select>
          </div>

        {/* Marital Status */}
        <div className="input-group">
          <label>Marital Status</label>
            <select
            className="demo-select"
            value={maritalStatus}
            onChange={(e) => setMaritalStatus(e.target.value)}
            >
            <option value="">Select...</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Domestic partnership">Domestic Partnership</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </div>

      {/* Head of Household */}
        <div className="input-group">
          <label>Are you the head of your household?</label>
          <select
            className="demo-select"
            value={householdHead}
            onChange={(e) => setHouseholdHead(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="Shared">Shared responsibility</option>
          </select>
        </div>

      {/* Household Size */}
        <div className="input-group">
          <label>Total Household Size (including yourself)</label>
          <input
            type="number"
            placeholder="e.g. 4"
            className="demo-input"
            value={householdSize}
            onChange={(e) => setHouseholdSize(e.target.value)}
          />
        </div>

      {/* Dependents */}
        <div className="input-group">
          <label>Number of People You Financially Support</label>
          <input
            type="number"
            placeholder="e.g. 2 (children, elderly parents, etc.)"
            className="demo-input"
            value={dependents}
            onChange={(e) => setDependents(e.target.value)}
          />
        </div>

      {/* Housing Status */}
        <div className="input-group">
          <label>Housing Status</label>
          <select
            className="demo-select"
            value={housingStatus}
            onChange={(e) => setHousingStatus(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="Own">Own my home</option>
            <option value="Rent">Renting</option>
            <option value="Living with family">Living with family</option>
            <option value="Subsidized housing">Subsidized / Public housing</option>
            <option value="Temporary">Temporary / Transitional housing</option>
            <option value="Homeless">Experiencing homelessness</option>
          </select>
        </div>

      {/* Education Level */}
        <div className="input-group">
          <label>Highest Education Level</label>
          <select
            className="demo-select"
            value={educationLevel}
            onChange={(e) => setEducationLevel(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="No diploma">No High School Diploma</option>
            <option value="High school">High School Diploma / GED</option>
            <option value="Some college">Some College</option>
            <option value="Associate">Associate Degree</option>
            <option value="Bachelor">Bachelor's Degree</option>
            <option value="Graduate">Graduate / Professional Degree</option>
          </select>
        </div>

      {/* Health Insurance */}
        <div className="input-group">
          <label>Health Insurance Status</label>
          <select
            className="demo-select"
            value={healthInsurance}
            onChange={(e) => setHealthInsurance(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="Employer">Through Employer</option>
            <option value="Self-purchased">Self-purchased / Marketplace</option>
            <option value="Dependent">Under Someone Else's Plan</option>
            <option value="Medicaid">Medicaid</option>
            <option value="Medicare">Medicare</option>
            <option value="Military">Military / VA</option>
            <option value="Uninsured">Uninsured</option>
          </select>
        </div>

      </div>
      
      {/* Income  */}
      <div className="account-section">
        <h3>💰 Income</h3>
        <div className="input-group">
          <label>Average Monthly Income</label>
          <div className="input-prefix-wrapper">
            <span>$</span>
            <input type="number" placeholder="0.00"
              value={avgMonthlyIncome}
              onChange={(e) => setAvgMonthlyIncome(e.target.value)} />
          </div>
        </div>
        <div className="input-group">
          <label>Income This Month <span className="optional">(optional — overrides average)</span></label>
          <div className="input-prefix-wrapper">
            <span>$</span>
            <input type="number" placeholder="0.00"
              value={thisMonthIncome}
              onChange={(e) => setThisMonthIncome(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Fixed Expenses */}
      <div className="account-section">
        <h3>🏠 Fixed Monthly Expenses</h3>
        <p className="section-desc">These are bills you pay every month that stay roughly the same.</p>
        {[
          { label: "Rent / Mortgage", value: rent, set: setRent },
          { label: "Utilities (electric, water, gas)", value: utilities, set: setUtilities },
          { label: "Insurance (health, car, home)", value: insurance, set: setInsurance },
          { label: "Subscriptions (Netflix, Spotify, etc.)", value: subscriptions, set: setSubscriptions },
          { label: "Other Fixed Expenses", value: otherFixed, set: setOtherFixed },
        ].map(({ label, value, set }) => (
          <div className="input-group" key={label}>
            <label>{label}</label>
            <div className="input-prefix-wrapper">
              <span>$</span>
              <input type="number" placeholder="0.00"
                value={value} onChange={(e) => set(e.target.value)} />
            </div>
          </div>
        ))}
        <div className="section-total">Fixed Total: <strong>${totalFixed.toFixed(2)}</strong></div>
      </div>

      {/* Variable Spending */}
      <div className="account-section">
        <h3>🛒 Variable Spending</h3>
        <p className="section-desc">These costs change month to month based on your habits.</p>
        {[
          { label: "Groceries", value: groceries, set: setGroceries },
          { label: "Transportation (gas, transit, Uber)", value: transportation, set: setTransportation },
          { label: "Eating Out", value: eatingOut, set: setEatingOut },
          { label: "Shopping (clothes, Amazon, etc.)", value: shopping, set: setShopping },
          { label: "Entertainment (events, hobbies)", value: entertainment, set: setEntertainment },
          { label: "Other Variable Expenses", value: otherVariable, set: setOtherVariable },
        ].map(({ label, value, set }) => (
          <div className="input-group" key={label}>
            <label>{label}</label>
            <div className="input-prefix-wrapper">
              <span>$</span>
              <input type="number" placeholder="0.00"
                value={value} onChange={(e) => set(e.target.value)} />
            </div>
          </div>
        ))}
        <div className="section-total">Variable Total: <strong>${totalVariable.toFixed(2)}</strong></div>
      </div>

      {/* Debt */}
      <div className="account-section">
        <h3>💳 Debt</h3>
        <div className="dti-explainer">
          <p>
            <strong>What is Debt-to-Income Ratio (DTI)?</strong> Your DTI is the percentage 
            of your monthly income that goes toward paying off debt. 
            Lenders use it to measure your financial health — a lower DTI means 
            you have more income available and are less of a financial risk.
          </p>
        </div>
        <div className="input-group">
          <label>Total Debt Amount</label>
          <div className="input-prefix-wrapper">
            <span>$</span>
            <input type="number" placeholder="0.00"
              value={totalDebt}
              onChange={(e) => setTotalDebt(e.target.value)} />
          </div>
        </div>

        {parseFloat(totalDebt) > 0 && (
          <div className="input-group">
            <label>Monthly Debt Payment</label>
            <div className="input-prefix-wrapper">
              <span>$</span>
              <input type="number" placeholder="0.00"
                value={monthlyDebtPayment}
                onChange={(e) => setMonthlyDebtPayment(e.target.value)} />
            </div>
          </div>
        )}

        {dti && (
          <div className="dti-result" style={{ borderColor: getDTIColor() }}>
            <p>Your DTI Ratio: <strong style={{ color: getDTIColor() }}>{dti}%</strong></p>
            <p className="dti-label">{getDTILabel()}</p>
          </div>
        )}
      </div>

      {/* Summary Card */}
      {income > 0 && (
        <div className="account-summary-card">
          <h3>📊 Monthly Snapshot</h3>
          <div className="snapshot-row">
            <span>Income</span>
            <span className="positive">+${income.toFixed(2)}</span>
          </div>
          <div className="snapshot-row">
            <span>Fixed Expenses</span>
            <span className="negative">-${totalFixed.toFixed(2)}</span>
          </div>
          <div className="snapshot-row">
            <span>Variable Spending</span>
            <span className="negative">-${totalVariable.toFixed(2)}</span>
          </div>
          {debtPayment > 0 && (
            <div className="snapshot-row">
              <span>Debt Payments</span>
              <span className="negative">-${debtPayment.toFixed(2)}</span>
            </div>
          )}
          <div className="snapshot-divider" />
          <div className="snapshot-row snapshot-remaining">
            <span>Remaining</span>
            <span style={{ color: remaining >= 0 ? "#38a169" : "#e53e3e" }}>
              {remaining >= 0 ? "+" : ""}${remaining.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Save Button */}
      <button className="save-btn" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : saved ? "✅ Saved!" : "Save Info"}
      </button>

    </div>
        </div>
  );
}

export default AccountInfo;