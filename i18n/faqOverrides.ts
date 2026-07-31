/** FAQ strings for .kryptix backup + iOS share sheet — merged on top of language packs */

export const faqOverridesByLang: Record<string, Record<string, string>> = {
  en: {
    faq4q: 'How do I import or export?',
    faq4a:
      'Two options: (1) Settings → Backup (.kryptix) creates an encrypted full-vault file (passwords, recovery phrases, and hardcoded entries — choose sections). Use a strong export passphrase; on iPhone the share sheet opens so you can Save to Files or AirDrop. Import from the same place (merge or replace). (2) In the Passwords tab, Import / Export still supports plain JSON or CSV for password-only transfer.',
    faq7q: 'How does the iOS share sheet work for backups?',
    faq7a:
      'After Encrypt & share, iOS shows the system share sheet with your .kryptix file. To keep a copy on the device: choose Save to Files → On My iPhone or iCloud Drive → Save. You can also AirDrop, Mail, or Messages. To restore later: Settings → Backup → Import .kryptix → Choose file from the Files app. The export passphrase is required to decrypt — store it safely offline.',
  },
  fa: {
    faq4q: 'چطور وارد یا خارج کنم؟',
    faq4a:
      'دو راه: (۱) تنظیمات ← پشتیبان (.kryptix) فایل رمزنگاری‌شدهٔ کل خزانه (رمزها، عبارات بازیابی و رمزهای ثابت — بخش‌ها را انتخاب کنید). عبارت عبور قوی بگذارید؛ در آیفون برگهٔ اشتراک برای Save to Files یا AirDrop باز می‌شود. ورود از همان مسیر با ادغام یا جایگزینی. (۲) در زبانهٔ رمزها، ورود/خروجی JSON یا CSV فقط برای رمزهای ورود.',
    faq7q: 'برگهٔ اشتراک iOS برای پشتیبان چگونه کار می‌کند؟',
    faq7a:
      'بعد از «رمزنگاری و اشتراک»، iOS برگهٔ اشتراک را با فایل .kryptix نشان می‌دهد. کپی محلی: Save to Files ← On My iPhone یا iCloud Drive. بازیابی: تنظیمات ← پشتیبان ← ورود .kryptix ← انتخاب از Files. بدون عبارت عبور خروجی فایل رمزگشایی نمی‌شود.',
  },
  ru: {
    faq4q: 'Как импортировать или экспортировать?',
    faq4a:
      'Два способа: (1) Настройки → Backup (.kryptix) — зашифрованный полный бэкап (пароли, фразы, жёсткие записи; разделы на выбор). Сильная фраза экспорта; на iPhone — share sheet (Save to Files / AirDrop). Импорт там же — merge или replace. (2) В «Пароли» JSON/CSV только для логинов.',
    faq7q: 'Как работает iOS share sheet для бэкапа?',
    faq7a:
      'После Encrypt & share iOS показывает share sheet с .kryptix. Сохраните через Save to Files на устройство или iCloud. Восстановление: Настройки → Backup → Import .kryptix → Choose file. Без фразы экспорта файл не расшифровать.',
  },
  de: {
    faq4q: 'Wie importiere/exportiere ich?',
    faq4a:
      'Zwei Wege: (1) Einstellungen → Backup (.kryptix) — verschlüsselte Vollsicherung (Passwörter, Phrasen, feste Einträge; Abschnitte wählbar). Starke Export-Passphrase; auf dem iPhone öffnet sich das Share Sheet (In Dateien sichern / AirDrop). Import dort mit Zusammenführen oder Ersetzen. (2) Im Tab Passwörter weiterhin JSON/CSV nur für Logins.',
    faq7q: 'Wie funktioniert das iOS-Share-Sheet bei Backups?',
    faq7a:
      'Nach „Encrypt & share“ zeigt iOS das Share Sheet mit der .kryptix-Datei. Lokal: In Dateien sichern → Auf meinem iPhone oder iCloud Drive. Später: Einstellungen → Backup → Import .kryptix → Datei wählen. Ohne Export-Passphrase keine Entschlüsselung.',
  },
  fr: {
    faq4q: 'Comment importer ou exporter ?',
    faq4a:
      'Deux options : (1) Réglages → Backup (.kryptix) — fichier chiffré du coffre entier (mots de passe, phrases, fixes — sections au choix). Phrase d’export forte ; sur iPhone la feuille de partage s’ouvre (Enregistrer dans Fichiers / AirDrop). Import au même endroit, fusion ou remplacement. (2) Onglet Mots de passe : JSON/CSV pour les logins uniquement.',
    faq7q: 'Comment marche la feuille de partage iOS pour les sauvegardes ?',
    faq7a:
      'Après Encrypt & share, iOS affiche la feuille de partage avec le fichier .kryptix. Copie locale : Enregistrer dans Fichiers → Sur mon iPhone ou iCloud Drive. Plus tard : Réglages → Backup → Import .kryptix → Choisir le fichier. Sans la phrase d’export, impossible de déchiffrer.',
  },
  zh: {
    faq4q: '如何导入或导出？',
    faq4a:
      '两种方式：（1）设置 → Backup（.kryptix）导出加密的完整保险库（密码、恢复短语、固定密码，可选区段）。使用强导出口令；在 iPhone 上会打开分享表（存储到“文件”/隔空投送）。同入口导入，可选合并或替换。（2）密码页的导入/导出仍支持仅密码的 JSON 或 CSV。',
    faq7q: 'iOS 分享表在备份时如何使用？',
    faq7a:
      '点“加密并分享”后，iOS 会显示带 .kryptix 文件的分享表。本地保存：存储到“文件”→ 我的 iPhone 或 iCloud 云盘。恢复：设置 → Backup → 导入 .kryptix → 从“文件”选择。没有导出口令无法解密。',
  },
  ar: {
    faq4q: 'كيف أستورد أو أصدّر؟',
    faq4a:
      'خياران: (1) الإعدادات ← النسخ الاحتياطي (.kryptix) ملف مشفّر للخزنة كاملة (كلمات المرور وعبارات الاسترداد والثابتة — اختر الأقسام). عبارة مرور قوية؛ على iPhone تفتح ورقة المشاركة (حفظ في Files / AirDrop). الاستيراد من نفس المكان دمج أو استبدال. (2) تبويب كلمات المرور: JSON أو CSV لعمليات الدخول فقط.',
    faq7q: 'كيف تعمل ورقة مشاركة iOS للنسخ الاحتياطي؟',
    faq7a:
      'بعد التشفير والمشاركة يعرض iOS ورقة المشاركة مع ملف .kryptix. للحفظ محلياً: Save to Files ← On My iPhone أو iCloud Drive. للاستعادة: الإعدادات ← النسخ الاحتياطي ← استيراد .kryptix ← اختر من Files. بدون عبارة المرور لا يمكن فك التشفير.',
  },
  tr: {
    faq4q: 'Nasıl içe/dışa aktarırım?',
    faq4a:
      'İki yol: (1) Ayarlar → Backup (.kryptix) şifreli tam kasa yedeği (şifreler, kurtarma, sabit — bölüm seçin). Güçlü dışa aktarma parolası; iPhone’da paylaşım sayfası (Save to Files / AirDrop). İçe aktarma aynı yerden birleştir veya değiştir. (2) Şifreler sekmesinde yalnızca girişler için JSON/CSV.',
    faq7q: 'Yedek için iOS paylaşım sayfası nasıl çalışır?',
    faq7a:
      'Encrypt & share sonrası iOS .kryptix dosyasıyla paylaşım sayfasını açar. Yerel kopya: Save to Files → On My iPhone veya iCloud Drive. Geri yükleme: Ayarlar → Backup → Import .kryptix → Files’tan seçin. Dışa aktarma parolası olmadan çözülemez.',
  },
  ja: {
    faq4q: 'インポート／エクスポートは？',
    faq4a:
      '2つの方法があります。(1) 設定 → Backup（.kryptix）で保管庫全体の暗号化バックアップ（パスワード・リカバリー・固定 — セクション選択可）。強いエクスポート用パスフレーズを使用。iPhone では共有シート（「ファイルに保存」/ AirDrop）が開きます。同じ場所からインポート（結合または置換）。(2) パスワードタブの JSON/CSV はログインのみ。',
    faq7q: 'バックアップ時の iOS 共有シートは？',
    faq7a:
      'Encrypt & share のあと、iOS が .kryptix 付きの共有シートを表示します。端末に残す: 「ファイルに保存」→「この iPhone 内」または iCloud Drive。復元: 設定 → Backup → Import .kryptix → ファイル App から選択。エクスポート用パスフレーズがないと復号できません。',
  },
  es: {
    faq4q: '¿Cómo importo o exporto?',
    faq4a:
      'Dos opciones: (1) Ajustes → Backup (.kryptix) crea un archivo cifrado de toda la bóveda (contraseñas, frases y fijas — elige secciones). Usa una frase de exportación fuerte; en iPhone se abre la hoja de compartir (Guardar en Archivos / AirDrop). Importa allí (fusionar o reemplazar). (2) En Contraseñas, Importar/Exportar sigue admitiendo JSON o CSV solo de logins.',
    faq7q: '¿Cómo funciona la hoja de compartir de iOS en las copias?',
    faq7a:
      'Tras Encrypt & share, iOS muestra la hoja de compartir con el archivo .kryptix. Copia local: Guardar en Archivos → En mi iPhone o iCloud Drive. Restaurar: Ajustes → Backup → Import .kryptix → Elegir desde Archivos. Sin la frase de exportación no se puede descifrar.',
  },
  pt: {
    faq4q: 'Como importo ou exporto?',
    faq4a:
      'Duas opções: (1) Definições → Backup (.kryptix) cria um ficheiro encriptado do cofre completo (palavras-passe, frases e fixas — escolha secções). Use uma frase de exportação forte; no iPhone abre a folha de partilha (Guardar em Ficheiros / AirDrop). Importe no mesmo sítio (unir ou substituir). (2) No separador Palavras-passe, JSON/CSV só para logins.',
    faq7q: 'Como funciona a folha de partilha iOS nas cópias de segurança?',
    faq7a:
      'Após Encrypt & share, o iOS mostra a folha de partilha com o ficheiro .kryptix. Cópia local: Guardar em Ficheiros → No meu iPhone ou iCloud Drive. Restaurar: Definições → Backup → Import .kryptix → escolher na app Ficheiros. Sem a frase de exportação não é possível desencriptar.',
  },
  it: {
    faq4q: 'Come importo o esporto?',
    faq4a:
      'Due opzioni: (1) Impostazioni → Backup (.kryptix) crea un file cifrato dell’intero caveau (password, frasi e fisse — scegli le sezioni). Usa una passphrase di export robusta; su iPhone si apre il foglio di condivisione (Salva in File / AirDrop). Importa lì (unisci o sostituisci). (2) Nella scheda Password, Importa/Esporta supporta ancora JSON o CSV solo per i login.',
    faq7q: 'Come funziona il foglio di condivisione iOS per i backup?',
    faq7a:
      'Dopo Encrypt & share, iOS mostra il foglio di condivisione con il file .kryptix. Copia locale: Salva in File → Su questo iPhone o iCloud Drive. Ripristino: Impostazioni → Backup → Import .kryptix → scegli dall’app File. Senza la passphrase di export non si può decifrare.',
  },
  el: {
    faq4q: 'Πώς εισάγω ή εξάγω;',
    faq4a:
      'Δύο τρόποι: (1) Ρυθμίσεις → Backup (.kryptix) δημιουργεί κρυπτογραφημένο πλήρες αντίγραφο (κωδικοί, φράσεις, σταθεροί — επιλέξτε ενότητες). Ισχυρή φράση εξαγωγής· στο iPhone ανοίγει το share sheet (Αποθήκευση στα Αρχεία / AirDrop). Εισαγωγή από το ίδιο σημείο (συγχώνευση ή αντικατάσταση). (2) Στην καρτέλα Κωδικοί, JSON/CSV μόνο για συνδέσεις.',
    faq7q: 'Πώς λειτουργεί το iOS share sheet στα αντίγραφα;',
    faq7a:
      'Μετά το Encrypt & share, το iOS δείχνει το share sheet με το αρχείο .kryptix. Τοπικό αντίγραφο: Αποθήκευση στα Αρχεία → Στο iPhone μου ή iCloud Drive. Επαναφορά: Ρυθμίσεις → Backup → Import .kryptix → επιλογή από Αρχεία. Χωρίς τη φράση εξαγωγής δεν αποκρυπτογραφείται.',
  },
  ko: {
    faq4q: '가져오기/내보내기는?',
    faq4a:
      '두 가지: (1) 설정 → Backup(.kryptix)으로 전체 보관함 암호화 백업(비밀번호·복구 구문·고정 — 섹션 선택). 강한 내보내기 암호 사용. iPhone에서는 공유 시트(파일에 저장 / AirDrop)가 열립니다. 같은 곳에서 가져오기(병합 또는 교체). (2) 비밀번호 탭의 JSON/CSV는 로그인만 해당.',
    faq7q: '백업 시 iOS 공유 시트는 어떻게 쓰나요?',
    faq7a:
      'Encrypt & share 후 iOS가 .kryptix 파일과 함께 공유 시트를 엽니다. 기기에 보관: 파일에 저장 → 내 iPhone 또는 iCloud Drive. 복원: 설정 → Backup → Import .kryptix → 파일 앱에서 선택. 내보내기 암호 없이는 복호화할 수 없습니다.',
  },
};

export function applyFaqOverrides(
  lang: string,
  base: Record<string, string>
): Record<string, string> {
  const extra = faqOverridesByLang[lang] ?? faqOverridesByLang.en;
  return { ...base, ...extra };
}
