# מדריך מפורט לבניית אפליקציות Android ו-iOS

## שלב 0: הכנה - התקנת תוכנות נדרשות

### בדיקת Node.js:
1. פתח Command Prompt (Windows) או Terminal (Mac/Linux)
2. כתב: `node --version`
3. אם תראה גרסה (למשל: v18.17.0) - מעולה!
4. אם לא - הורד והתקן מ: https://nodejs.org

### התקנת Git ב-Windows (אם לא מותקן):
1. לך לאתר: https://git-scm.com/download/win
2. לחץ על "Download for Windows"
3. הרץ את הקובץ שהורד
4. במהלך ההתקנה - לחץ "Next" על הכל (ההגדרות ברירת המחדל בסדר)
5. **חשוב**: אחרי ההתקנה, סגור את Command Prompt ופתח חדש!
6. בדוק: כתב `git --version` - אמור להציג גרסה

### התקנת Android Studio:
1. לך לאתר: https://developer.android.com/studio
2. לחץ "Download Android Studio"
3. הרץ את ההתקנה עם כל ההגדרות ברירת המחדל
4. בפתיחה הראשונה - תן ל-Android Studio להוריד את ה-SDK

### התקנת Xcode (רק למחשבי Mac):
1. פתח App Store
2. חפש "Xcode"
3. לחץ "Get" והמתן להתקנה (יכול לקחת זמן רב!)
4. פתח את Xcode פעם אחת כדי לאשר את התנאים

## שלב 1: העברת הפרויקט ל-GitHub

### 1.1 יצוא הפרויקט מלובייבל:
1. בלובייבל, חפש את הכפתור "Export to GitHub" (בחלק העליון)
2. לחץ עליו ותעבור להגדרות GitHub
3. אם זו הפעם הראשונה - תצטרך להתחבר לחשבון GitHub שלך
4. בחר שם לפרויקט (למשל: family-finance-plus)
5. לחץ "Create Repository"

### 1.2 העתקת הפרויקט למחשב:
1. פתח Command Prompt או Terminal
2. נווט לתיקייה שבה תרצה לשמור את הפרויקט (למשל: `cd Desktop`)
3. העתק את הפקודה מה-GitHub (החלף את YOUR_USERNAME ו-YOUR_REPO_NAME):
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```
4. כנס לתיקיית הפרויקט:
```bash
cd YOUR_REPO_NAME
```

## שלב 2: התקנת Dependencies

### 2.1 התקנה:
```bash
npm install
```
**המתן שהפקודה תסתיים לחלוטין** - יכול לקחת כמה דקות בפעם הראשונה.

### 2.2 בדיקה שהכל תקין:
אם הכל עבד נכון, תראה הודעה כמו:
```
added xxx packages in xxx seconds
```

## שלב 3: הוספת פלטפורמות נייד

### 3.1 עבור Android:
הרץ בזה אחר זה:
```bash
npx cap add android
```
המתן שיסתיים, ואז:
```bash
npx cap update android
```

### 3.2 עבור iOS (רק על Mac):
הרץ בזה אחר זה:
```bash
npx cap add ios
```
המתן שיסתיים, ואז:
```bash
npx cap update ios
```

## שלב 4: בניית הפרויקט

### 4.1 בנייה:
```bash
npm run build
```
**חשוב**: חכה שהפקודה תסתיים לחלוטין לפני המשך!

### 4.2 בדיקה שהבנייה הצליחה:
אמור להופיע משהו כמו:
```
✓ built in xxxms
```

## שלב 5: סנכרון עם Capacitor

### 5.1 עבור Android:
```bash
npx cap sync android
```

### 5.2 עבור iOS:
```bash
npx cap sync ios
```

## שלב 6: פתיחת הפרויקט

### 6.1 Android - פתיחה ב-Android Studio:
```bash
npx cap open android
```
**חשוב**: Android Studio יפתח אוטומטית. אל תסגור את החלון של Command Prompt!

### 6.2 iOS - פתיחה ב-Xcode (Mac בלבד):
```bash
npx cap open ios
```
**חשוב**: Xcode יפתח אוטומטית.

## שלב 7: בניית APK ב-Android Studio

### 7.1 הכנה ל-Android Studio:
כשהרצת `npx cap open android`, Android Studio אמור להיפתח אוטומטית.

### 7.2 המתנה לטעינת הפרויקט:
1. **אל תלחץ על כלום בינתיים!** 
2. תראה בתחתית המסך סרגל התקדמות עם הכיתוב "Gradle Build Running"
3. זה יכול לקחת **5-15 דקות בפעם הראשונה** - זה רגיל!
4. תראה הודעות כמו "Downloading..." ו-"Building..."
5. כשיסתיים - תראה "BUILD SUCCESSFUL" בתחתית

### 7.3 בדיקה שהפרויקט נטען:
- בצד שמאל, תראה עץ קבצים עם תיקיות כמו "app", "gradle"
- אם יש סמן חמור (!) או שגיאות - חכה עוד קצת או ראה פתרון בעיות למטה

### 7.4 בניית ה-APK - צעד אחר צעד:
1. **לך לתפריט העליון** (שורת התפריטים הראשית)
2. **לחץ על "Build"** (אם לא רואה, נסה לחצן hamburger menu)
3. **תראה תפריט נפתח** - חפש "Build Bundle(s) / APK(s)"
4. **מהתפריט הפנימי, בחר "Build APK(s)"**
5. **יופיע מסך קטן** - לחץ "Build APK"

### 7.5 המתנה לבנייה:
1. בתחתית המסך תראה "Build Running"
2. יכול לקחת **2-10 דקות**
3. תראה הודעות כמו "Task :app:compileDebugJavaWithJavac"
4. **כשמסתיים**, יופיע באמצע המסך חלון קטן עם הכיתוב:
   **"APK(s) generated successfully"**

### 7.6 מציאת ה-APK:
1. בחלון ההודעה, לחץ על **"locate"** או **"Show in Explorer"**
2. יפתח Explorer/Finder עם הקובץ APK
3. שם הקובץ יהיה משהו כמו: `app-debug.apk`

### 7.7 פתרון בעיות נפוצות:

**אם אין תפריט "Build":**
- נסה את הקיצור: `Ctrl+F9` (Windows) או `Cmd+F9` (Mac)

**אם יש שגיאת "SDK not found":**
1. לך ל: File → Settings → Appearance & Behavior → System Settings → Android SDK
2. וודא שיש Android SDK מותקן (בדרך כלל API 33 או 34)

**אם יש שגיאות Gradle:**
1. לך לתפריט: Build → Clean Project
2. חכה שיסתיים
3. אז: Build → Rebuild Project

**אם כלום לא עובד:**
- סגור את Android Studio
- פתח Command Prompt בתיקיית הפרויקט
- הרץ: `npx cap sync android`
- הרץ שוב: `npx cap open android`

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