/**
 * ============================================================
 *  Conversor PDF / DOCX / Text → EPUB  (v3)
 *  Google Apps Script — codigo.gs
 * ============================================================
 *
 *  COM DESPLEGAR:
 *
 *  1. Ves a  https://script.google.com  →  Projecte nou
 *
 *  2. Selecciona el fitxer «Codi.gs» que ja existeix
 *     i enganxa-hi TOT el contingut d'aquest fitxer.
 *
 *  3. Menú:  Fitxer  →  Nou  →  HTML
 *     Al quadre escriu NOMES:  index
 *     (sense posar .html, GAS ja ho afegeix sol)
 *
 *  4. Al fitxer «index.html» creat, enganxa-hi
 *     tot el contingut del fitxer index.html adjunt.
 *
 *  5. Implementar → Nova implementació → Aplicació web
 *     Executa com: Jo
 *     Qui té accés: Qualsevol amb compte Google
 *
 *  6. Autoritza els permisos i copia la URL.
 * ============================================================
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Conversor PDF/DOCX/Text → EPUB')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/** Desa un EPUB generat a Google Drive */
function saveEpubToDrive(base64Data, fileName, folderId) {
  try {
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error('Dades buides o base64 invàlid.');
    }
    fileName = (fileName || 'llibre.epub').toString().trim();
    // Evita caràcters problemàtics a Drive i assegura extensió .epub
        fileName = fileName.replace(/[\\/\:\*\?"<>\|]+/g, '_');
    if (!/\.epub$/i.test(fileName)) fileName += '.epub';
    var bytes = Utilities.base64Decode(base64Data);
    var blob  = Utilities.newBlob(bytes, 'application/epub+zip', fileName);
    var file;
    if (folderId) {
      var folder = DriveApp.getFolderById(folderId);
      file = folder.createFile(blob);
    } else {
      file = DriveApp.createFile(blob);
    }
    return {
      success: true,
      id:   file.getId(),
      url:  file.getUrl(),
      name: file.getName(),
      size: file.getSize()
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/** Llegeix un PDF o DOCX des de Drive i retorna Base64 */
function readFileFromDrive(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    var mime = blob.getContentType();
    var valid = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (valid.indexOf(mime) === -1)
      return { success: false, error: 'Format no suportat: ' + mime };
    return {
      success:  true,
      base64:   Utilities.base64Encode(blob.getBytes()),
      mimeType: mime,
      name:     file.getName(),
      size:     file.getSize()
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/** Cerca fitxers PDF i DOCX a Drive */
function searchDriveFiles(query) {
  try {
    var q = "(mimeType='application/pdf' or " +
            "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document')";
    if (query && query.trim())
      q += " and title contains '" + query.replace(/'/g, "\\'") + "'";
    q += " and trashed=false";
    var files = DriveApp.searchFiles(q);
    var result = [], count = 0;
    while (files.hasNext() && count < 50) {
      var f = files.next();
      result.push({
        id: f.getId(), name: f.getName(),
        mimeType: f.getMimeType(), size: f.getSize()
      });
      count++;
    }
    result.sort(function(a,b){ return a.name.localeCompare(b.name); });
    return { success: true, files: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

