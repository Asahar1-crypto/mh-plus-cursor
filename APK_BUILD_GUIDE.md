# מדריך בניית אפליקציות Android ו-iOS לאפליקציית מחציות פלוס

## דרישות מוקדמות

### לאפליקציית Android:
- מחשב Windows/Mac/Linux
- Node.js מותקן (גרסה 16 או יותר חדשה)
- Android Studio מותקן ומוגדר
- Git מותקן

### לאפליקציית iOS:
- **מחשב Mac בלבד** (iOS development זמין רק על macOS)
- Xcode מותקן מה-App Store
- Node.js מותקן (גרסה 16 או יותר חדשה)
- Git מותקן

### התקנת Git ב-Windows:
1. היכנס לאתר: https://git-scm.com/download/win
2. הורד את הקובץ המתאים למערכת שלך (64-bit או 32-bit)
3. הרץ את ההתקנה עם כל ההגדרות ברירת המחדל
4. אחרי ההתקנה, פתח Command Prompt חדש (חשוב!)
5. בדוק שהתקנה הצליחה על ידי הרצת: `git --version`

### בדיקה אם Git מותקן:
פתח Command Prompt וכתב:
```bash
git --version
```
אם תראה גרסה (למשל: git version 2.41.0), Git מותקן. אם לא - בצע התקנה.

## שלב 1: העברת הפרויקט ל-GitHub
1. לחץ על כפתור "Export to GitHub" בלובייבל
2. צור repository חדש ב-GitHub שלך
3. Clone את הפרויקט למחשב שלך:
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

## שלב 2: התקנת Dependencies
```bash
npm install
```

## שלב 3: הוספת פלטפורמות

### עבור Android:
```bash
npx cap add android
npx cap update android
```

### עבור iOS (רק על Mac):
```bash
npx cap add ios
npx cap update ios
```

## שלב 4: בניית הפרויקט
```bash
npm run build
```

## שלב 5: סנכרון עם Capacitor

### עבור Android:
```bash
npx cap sync android
```

### עבור iOS:
```bash
npx cap sync ios
```

## שלב 6: פתיחה ובנייה

### Android - פתיחת הפרויקט ב-Android Studio:
```bash
npx cap open android
```

### iOS - פתיחת הפרויקט ב-Xcode (Mac בלבד):
```bash
npx cap open ios
```

## שלב 7: בניית APK ב-Android Studio

### פתיחת הפרויקט:
1. Android Studio יפתח את הפרויקט אוטומטית
2. **חשוב**: חכה שהפרויקט יטען לחלוטין - זה יכול לקחת כמה דקות בפעם הראשונה
3. תראה בתחתית המסך את ההודעות של Gradle Build - חכה שיסתיים

### בניית APK:
1. כשהפרויקט נטען, לך לתפריט העליון
2. בחר: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. תתחיל בנייה - תראה progress bar בתחתית המסך
4. חכה שהבנייה תסתיים (יכול לקחת כמה דקות)
5. כשמסתיים, יופיע הודעה: "APK(s) generated successfully"
6. לחץ על "locate" או "Event Log" כדי למצוא את ה-APK

### אם יש שגיאות:
- וודא שיש לך חיבור לאינטרנט (Gradle צריך להוריד dependencies)
- נסה: **Build** → **Clean Project** ואז **Build** → **Rebuild Project**

## שלב 8: בניית IPA ב-Xcode (Mac בלבד)

### פתיחת הפרויקט:
1. Xcode יפתח את הפרויקט אוטומטית
2. **חשוב**: חכה שהפרויקט יטען לחלוטין
3. בחר את ה-Device או Simulator שתרצה להריץ עליו

### בניית IPA:
1. כשהפרויקט נטען, לך לתפריט העליון
2. בחר: **Product** → **Archive**
3. חכה שהבנייה תסתיים
4. ב-Organizer יופיע ה-Archive שנבנה
5. לחץ "Distribute App" לייצוא IPA או העלאה ל-App Store

### הרצה על Simulator:
1. בחר Simulator מהרשימה העליונה
2. לחץ על כפתור ה-Play (▶️)
3. האפליקציה תיפתח ב-Simulator

## מיקום קבצים

### Android APK:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### iOS (נמצא ב-Xcode Organizer):
- Archive: נמצא דרך Window → Organizer
- IPA: נשמר במיקום שתבחר בזמן הייצוא

## התקנה על מכשירים

### Android:
1. העבר את קובץ ה-APK למכשיר Android
2. הפעל "Unknown Sources" בהגדרות הביטחון
3. לחץ על קובץ ה-APK והתקן

### iOS:
1. לבדיקה על מכשיר פיזי: חבר את המכשיר ובחר אותו ב-Xcode
2. לייצור: השתמש ב-Archive ו-Distribute App
3. לפרסום: העלה ל-App Store Connect

## טיפים חשובים:
- לבניית APK לפרסום (Release), השתמש ב-"Generate Signed Bundle / APK"
- תצטרך ליצור Keystore לחתימה דיגיטלית
- עבור Google Play Store תצטרך AAB (Android App Bundle) ולא APK

## פתרון בעיות נפוצות:
- אם יש שגיאות Gradle, נסה `./gradlew clean` בתיקיית android
- אם יש בעיות עם SDK, וודא ש-Android Studio מוגדר נכון
- לעדכונים עתידיים, הרץ `npx cap sync` אחרי כל `git pull`

## הערות נוספות:
- האפליקציה תתחבר לשרת הפיתוח של לובייבל
- לאפליקציה בפרודקשן תצטרך לבנות את הפרויקט ולארח אותו בנפרד