import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { storage } from "@/src/utils/storage";

export type Lang = "en" | "hi";

const dict = {
  en: {
    appName: "Mayank Store",
    shopTagline: "Digital Khata",
    // PIN
    setPin: "Set your 4-digit PIN",
    confirmPin: "Confirm PIN",
    enterPin: "Enter your PIN",
    pinsDontMatch: "PINs do not match",
    incorrectPin: "Incorrect PIN",
    forgotPin: "Forgot PIN?",
    forgotPinNote: "PIN reset requires app reinstall or admin help. Please contact support.",
    // Dashboard
    youWillGive: "You will Give",
    youWillGet: "You will Get",
    netBalance: "Net Balance",
    searchParties: "Search party",
    addParty: "Add Party",
    parties: "Parties",
    reminders: "Reminders",
    emptyPartiesTitle: "Start your Khata",
    emptyPartiesBody: "Add your first customer to begin tracking receivables and payables.",
    noResults: "No matching customers",
    settings: "Settings",
    // Party
    partyDetails: "Customer Details",
    balance: "Balance",
    theyOweYou: "They owe you",
    youOweThem: "You owe them",
    settled: "Settled",
    noTransactions: "No transactions yet",
    tapBelowToStart: "Tap the buttons below to add your first entry",
    youGave: "You Gave",
    youGot: "You Got",
    sendReminder: "Send Reminder",
    call: "Call",
    edit: "Edit",
    delete: "Delete",
    // Add party
    newCustomer: "New Customer",
    name: "Name",
    phone: "Phone",
    address: "Address",
    nameRequired: "Name is required",
    save: "Save",
    cancel: "Cancel",
    // Transaction
    amount: "Amount",
    note: "Note (item / bill no)",
    date: "Date",
    gaveTitle: "You Gave",
    gotTitle: "You Got",
    amountRequired: "Enter valid amount",
    // Settings
    language: "Language",
    english: "English",
    hindi: "Hindi",
    changePin: "Change PIN",
    currentPin: "Current PIN",
    newPin: "New PIN",
    monthlyReport: "Monthly PDF Report",
    generateReport: "Generate Report",
    reportGenerated: "Report ready",
    lockApp: "Lock App",
    aboutStore: "About",
    aboutText: "Mayank Store Khata • Digital ledger for your shop",
    // Reminders
    reminderMessage: (name: string, amount: string) =>
      `Hi ${name}, this is a friendly reminder from Mayank Store. Your pending balance is ${amount}. Please clear at your convenience. Thank you!`,
    whatsapp: "WhatsApp",
    sms: "SMS",
    noReminders: "All caught up! No pending dues.",
    pendingFrom: "Pending from",
    // Report
    reportTitle: "Monthly Report",
    selectMonth: "Select Month",
    totalGave: "Total You Gave",
    totalGot: "Total You Got",
    // Misc
    today: "Today",
    yesterday: "Yesterday",
    confirmDelete: "Delete this?",
    deletePartyMsg: "This will remove the customer and all their transactions.",
    deleteTxMsg: "This transaction will be removed permanently.",
    yes: "Yes",
    no: "No",
    close: "Close",
    loading: "Loading...",
    error: "Something went wrong",
    retry: "Retry",
    transactions: "Transactions",
  },
  hi: {
    appName: "मयंक स्टोर",
    shopTagline: "डिजिटल खाता",
    setPin: "अपना 4-अंकों का PIN सेट करें",
    confirmPin: "PIN पुष्टि करें",
    enterPin: "अपना PIN दर्ज करें",
    pinsDontMatch: "PIN मेल नहीं खाते",
    incorrectPin: "गलत PIN",
    forgotPin: "PIN भूल गए?",
    forgotPinNote: "PIN reset के लिए app दोबारा install करें या admin से संपर्क करें।",
    youWillGive: "आप देंगे",
    youWillGet: "आप लेंगे",
    netBalance: "कुल बाकी",
    searchParties: "पार्टी खोजें",
    addParty: "पार्टी जोड़ें",
    parties: "पार्टियाँ",
    reminders: "रिमाइंडर",
    emptyPartiesTitle: "अपना खाता शुरू करें",
    emptyPartiesBody: "पहला ग्राहक जोड़कर लेन-देन ट्रैक करना शुरू करें।",
    noResults: "कोई ग्राहक नहीं मिला",
    settings: "सेटिंग्स",
    partyDetails: "पार्टी विवरण",
    balance: "बकाया",
    theyOweYou: "लेना है",
    youOweThem: "देना है",
    settled: "हिसाब बराबर",
    noTransactions: "कोई लेन-देन नहीं",
    tapBelowToStart: "पहली एंट्री जोड़ने के लिए नीचे बटन दबाएँ",
    youGave: "आपने दिए",
    youGot: "आपने लिए",
    sendReminder: "रिमाइंडर भेजें",
    call: "कॉल",
    edit: "एडिट",
    delete: "डिलीट",
    newParty: "नई पार्टी",
    name: "पार्टी का नाम",
    phone: "फ़ोन",
    address: "पता",
    firmName: "फर्म का नाम",
    contactPerson: "संपर्क व्यक्ति",
    gstNumber: "GST नंबर",
    optional: "वैकल्पिक",
    openingBalance: "पुराना बकाया",
    openingBalanceHint: "इस ऐप से पहले का कोई बचा हुआ हिसाब",
    balanceType: "बकाया का प्रकार",
    toReceive: "लेना है",
    toPay: "देना है",
    noOpeningBalance: "कोई पुराना बकाया नहीं",
    nameRequired: "पार्टी का नाम ज़रूरी है",
    save: "सेव",
    cancel: "कैंसिल",
    amount: "रकम",
    note: "नोट (सामान / बिल नं)",
    date: "तारीख",
    gaveTitle: "आपने दिए",
    gotTitle: "आपने लिए",
    amountRequired: "सही रकम डालें",
    language: "भाषा",
    english: "English",
    hindi: "हिंदी",
    changePin: "PIN बदलें",
    currentPin: "पुराना PIN",
    newPin: "नया PIN",
    monthlyReport: "महीने की PDF रिपोर्ट",
    generateReport: "रिपोर्ट बनाएँ",
    reportGenerated: "रिपोर्ट तैयार है",
    lockApp: "ऐप लॉक करें",
    aboutStore: "जानकारी",
    aboutText: "मयंक स्टोर खाता • आपकी दुकान का डिजिटल खाता",
    reminderMessage: (name: string, amount: string) =>
      `नमस्ते ${name}, मयंक स्टोर से रिमाइंडर। आपका बकाया ${amount} है। कृपया जल्द भुगतान करें। धन्यवाद!`,
    whatsapp: "WhatsApp",
    sms: "SMS",
    noReminders: "सब हिसाब बराबर! कोई बकाया नहीं।",
    pendingFrom: "बकाया",
    reportTitle: "महीने की रिपोर्ट",
    selectMonth: "महीना चुनें",
    totalGave: "कुल दिए",
    totalGot: "कुल लिए",
    today: "आज",
    yesterday: "कल",
    confirmDelete: "क्या डिलीट करें?",
    deletePartyMsg: "यह ग्राहक और उनके सभी लेन-देन हट जाएंगे।",
    deleteTxMsg: "यह लेन-देन स्थायी रूप से हट जाएगा।",
    yes: "हाँ",
    no: "नहीं",
    close: "बंद करें",
    loading: "लोड हो रहा है...",
    error: "कुछ गलत हुआ",
    retry: "दोबारा कोशिश करें",
    transactions: "लेन-देन",
  },
};

type Dict = typeof dict.en;

type I18nContextType = {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => Promise<void>;
};

const I18nContext = createContext<I18nContextType | null>(null);

const LANG_KEY = "app_language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    (async () => {
      const stored = await storage.getItem<string>(LANG_KEY, "en");
      if (stored === "hi" || stored === "en") setLangState(stored);
    })();
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    await storage.setItem(LANG_KEY, l);
  }, []);

  return (
    <I18nContext.Provider value={{ lang, t: dict[lang], setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
