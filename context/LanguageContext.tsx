import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "ro" | "fr" | "de" | "es";

interface LanguageContextType {
language: Language;
setLanguage: (lang: Language) => void;
t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
language: "en",
setLanguage: () => {},
t: (key: string) => key,
});

const translations: Record<Language, Record<string, string>> = {
en: {
// Navigation & General
today: "TODAY",
history: "HISTORY",
discover: "DISCOVER MORE",
profile_title: "YOUR PROFILE",
appearance: "Appearance",
language: "Language",
sign_out: "Sign Out",
status: "Status",
role: "Role",
active: "Active",
// Auth & Welcome
welcome_headline: "Discover History\nEvery Day",
get_started: "GET STARTED",
login: "Log In",
register: "Register",
email: "Email Address",
password: "Password",
username: "Username",
// Notifications
notif_title: "Don't Miss History",
notif_desc: "Get a daily notification about what happened today in the past.",
allow_notif: "ALLOW NOTIFICATIONS",
skip: "Maybe later",
// Card & Modal (Noile chei de design)
share_message: "Check out this historical moment: ",
tap_for_story: "TAP FOR STORY",
impact: "IMPACT",
significance: "SIGNIFICANCE",
score: "Impact Score",
close: "Close",
// Categories
war: "WAR",
art: "ART",
science: "SCIENCE",
politics: "POLITICS",
exploration: "EXPLORATION"
},
ro: {
today: "ASTĂZI",
history: "ISTORIE",
discover: "DESCOPERĂ MAI MULT",
profile_title: "PROFILUL TĂU",
appearance: "Aspect",
language: "Limbă",
sign_out: "Deconectare",
status: "Status",
role: "Rol",
active: "Activ",
welcome_headline: "Descoperă Istoria\nÎn Fiecare Zi",
get_started: "ÎNCEPE ACUM",
login: "Autentificare",
register: "Înregistrare",
email: "Adresă Email",
password: "Parolă",
username: "Nume utilizator",
notif_title: "Nu Rata Istoria",
notif_desc: "Primește o notificare zilnică despre ce s-a întâmplat astăzi în trecut.",
allow_notif: "PERMITE NOTIFICĂRILE",
skip: "Mai târziu",
share_message: "Aruncă o privire peste acest moment istoric: ",
tap_for_story: "APASĂ PENTRU POVESTE",
impact: "IMPACT",
significance: "SEMNIFICAȚIE",
score: "Scor Impact",
close: "Închide",
war: "RĂZBOI",
art: "ARTĂ",
science: "ȘTIINȚĂ",
politics: "POLITICĂ",
exploration: "EXPLORARE"
},
fr: {
today: "AUJOURD'HUI",
history: "HISTOIRE",
discover: "DÉCOUVRIR",
profile_title: "VOTRE PROFIL",
appearance: "Apparence",
language: "Langue",
sign_out: "Déconnexion",
status: "Statut",
role: "Rôle",
active: "Actif",
welcome_headline: "Découvrez l'Histoire\nChaque Jour",
get_started: "COMMENCER",
login: "Connexion",
register: "S'inscrire",
email: "E-mail",
password: "Mot de passe",
username: "Nom d'utilisateur",
notif_title: "Ne manquez pas l'histoire",
notif_desc: "Recevez une notification quotidienne sur ce qui s'est passé aujourd'hui.",
allow_notif: "AUTORISER LES NOTIFICATIONS",
skip: "Plus tard",
share_message: "Découvrez ce moment historique : ",
tap_for_story: "APPUYEZ POUR L'HISTOIRE",
impact: "IMPACT",
significance: "SIGNIFICATION",
score: "Score d'impact",
close: "Fermer",
war: "GUERRE",
art: "ART",
science: "SCIENCE",
politics: "POLITIQUE",
exploration: "EXPLORATION"
},
de: {
today: "HEUTE",
history: "GESCHICHTE",
discover: "ENTDECKEN",
profile_title: "DEIN PROFIL",
appearance: "Aussehen",
language: "Sprache",
sign_out: "Abmelden",
status: "Status",
role: "Rolle",
active: "Aktiv",
welcome_headline: "Entdecke die Geschichte\njeden Tag",
get_started: "JETZT STARTEN",
login: "Anmelden",
register: "Registrieren",
email: "E-Mail-Adresse",
password: "Passwort",
username: "Benutzername",
notif_title: "Geschichte nicht verpassen",
notif_desc: "Tägliche Benachrichtigung über Ereignisse in der Vergangenheit erhalten.",
allow_notif: "BENACHRICHTIGUNGEN ERLAUBEN",
skip: "Vielleicht später",
share_message: "Sieh dir diesen historischen Moment an: ",
tap_for_story: "FÜR GESCHICHTE TIPPEN",
impact: "EINFLUSS",
significance: "BEDEUTUNG",
score: "Einfluss-Wert",
close: "Schließen",
war: "KRIEG",
art: "KUNST",
science: "WISSENSCHAFT",
politics: "POLITIK",
exploration: "ENTDECKUNG"
},
es: {
today: "HOY",
history: "HISTORIA",
discover: "DESCUBRIR MÁS",
profile_title: "TU PERFIL",
appearance: "Apariencia",
language: "Idioma",
sign_out: "Cerrar Sesión",
status: "Estado",
role: "Rol",
active: "Activo",
welcome_headline: "Descubre la Historia\nCada Día",
get_started: "EMPEZAR",
login: "Iniciar Sesión",
register: "Registrarse",
email: "Correo electrónico",
password: "Contraseña",
username: "Nombre de usuario",
notif_title: "No te pierdas la historia",
notif_desc: "Recibe una notificación diaria sobre lo que pasó hoy en el pasado.",
allow_notif: "PERMITIR NOTIFICACIONES",
skip: "Más tarde",
share_message: "Echa un vistazo a este momento histórico: ",
tap_for_story: "TOCA PARA LA HISTORIA",
impact: "IMPACTO",
significance: "SIGNIFICADO",
score: "Puntuación de impacto",
close: "Cerrar",
war: "GUERRA",
art: "ARTE",
science: "CIENCIA",
politics: "POLÍTICA",
exploration: "EXPLORACIÓN"
}
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
const [language, setLanguageState] = useState<Language>("en");

useEffect(() => {
loadLanguage();
}, []);

const loadLanguage = async () => {
try {
const stored = await AsyncStorage.getItem("app_language");
if (stored) setLanguageState(stored as Language);
} catch (e) {
console.error("Failed to load language", e);
}
};

const setLanguage = async (lang: Language) => {
setLanguageState(lang);
await AsyncStorage.setItem("app_language", lang);
};

const t = (key: string) => {
// Convertim cheia în lowercase pentru a fi siguri că găsim categoriile (ex: "HISTORY" -> "history")
const searchKey = key.toLowerCase();
return translations[language]?.[key] || translations[language]?.[searchKey] || key;
};

return (
<LanguageContext.Provider value={{ language, setLanguage, t }}>
{children}
</LanguageContext.Provider>
);
};

export const useLanguage = () => useContext(LanguageContext);