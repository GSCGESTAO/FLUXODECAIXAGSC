
/**
 * GSC FLUXO DE CAIXA - BACKEND BRIDGE v2.4
 * RBAC e Gestão Avançada de Usuários
 */

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const estSheet = ss.getSheetByName("Estabelecimentos") || ss.insertSheet("Estabelecimentos");
  const establishments = estSheet.getDataRange().getValues().slice(1).map(row => ({ id: String(row[0]), name: String(row[1]), responsibleEmail: String(row[2]) }));

  const userSheet = ss.getSheetByName("Usuarios") || ss.insertSheet("Usuarios");
  const authorizedUsers = userSheet.getDataRange().getValues().slice(1).filter(row => row[1] && String(row[1]).includes("@")).map(row => ({ email: String(row[1]).toLowerCase().trim(), role: String(row[2]) || 'Convidado' }));

  const transSheet = ss.getSheetByName("Transacoes") || ss.insertSheet("Transacoes");
  const transValues = transSheet.getDataRange().getValues();
  const transactions = transValues.length > 1 ? transValues.slice(1).map(row => ({ id: String(row[0]), date: String(row[1] instanceof Date ? row[1].toISOString().split('T')[0] : row[1]), timestamp: String(row[2]), establishmentId: String(row[3]), type: String(row[4]), amount: Number(row[5]), description: String(row[6]), observations: String(row[7]), status: String(row[8]), user: String(row[9]) })).reverse() : [];

  const notesSheet = ss.getSheetByName("Anotacoes") || ss.insertSheet("Anotacoes");
  const notesMap = {};
  notesSheet.getDataRange().getValues().slice(1).forEach(row => { notesMap[String(row[0])] = String(row[1]); });

  const settingsSheet = ss.getSheetByName("Configuracoes") || ss.insertSheet("Configuracoes");
  let settings = null;
  try { settings = JSON.parse(settingsSheet.getRange("A2").getValue()); } catch(e) { settings = {}; }

  return ContentService.createTextOutput(JSON.stringify({ establishments, authorizedUsers, transactions, notes: notesMap, settings })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const user = payload.user || "Unknown";

    if (action === 'ADD_TRANSACTION') {
      ss.getSheetByName("Transacoes").appendRow([payload.id, payload.date, payload.timestamp, payload.establishmentId, payload.type, payload.amount, payload.description, payload.observations || "", payload.status, payload.user]);
      logActivity(ss, user, "ADD_TRANSACTION", `Valor: ${payload.amount}`);
    } 
    else if (action === 'EDIT_TRANSACTION') {
      const sheet = ss.getSheetByName("Transacoes");
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === payload.id) { sheet.getRange(i + 1, 1, 1, 10).setValues([[payload.id, payload.date, payload.timestamp, payload.establishmentId, payload.type, payload.amount, payload.description, payload.observations || "", payload.status, payload.user]]); break; }
      }
      logActivity(ss, user, "EDIT_TRANSACTION", `ID: ${payload.id}`);
    }
    else if (action === 'ADD_USER') {
      const sheet = ss.getSheetByName("Usuarios") || ss.insertSheet("Usuarios");
      sheet.appendRow([Utilities.getUuid(), payload.email.toLowerCase().trim(), payload.role]);
      logActivity(ss, user, "ADD_USER", `E-mail: ${payload.email}`);
    }
    else if (action === 'EDIT_USER') {
      const sheet = ss.getSheetByName("Usuarios");
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]).toLowerCase() === payload.id.toLowerCase()) { // Usando o email antigo como ID de busca
          sheet.getRange(i + 1, 2, 1, 2).setValues([[payload.email.toLowerCase().trim(), payload.role]]);
          break;
        }
      }
      logActivity(ss, user, "EDIT_USER", `Para: ${payload.email}`);
    }
    else if (action === 'DELETE_USER') {
      const sheet = ss.getSheetByName("Usuarios");
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]).toLowerCase() === payload.id.toLowerCase()) { sheet.deleteRow(i + 1); break; }
      }
      logActivity(ss, user, "DELETE_USER", `E-mail: ${payload.id}`);
    }
    else if (action === 'UPDATE_SETTINGS') {
      const sheet = ss.getSheetByName("Configuracoes") || ss.insertSheet("Configuracoes");
      sheet.getRange("A2").setValue(JSON.stringify(payload.settings));
    }
    else if (action === 'UPDATE_NOTE') {
      const sheet = ss.getSheetByName("Anotacoes") || ss.insertSheet("Anotacoes");
      const data = sheet.getDataRange().getValues();
      let found = false;
      for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === payload.entityId) { sheet.getRange(i + 1, 2).setValue(payload.notes); found = true; break; } }
      if (!found) sheet.appendRow([payload.entityId || "GENERAL", payload.notes]);
    }

    return ContentService.createTextOutput(JSON.stringify({ "status": "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function logActivity(ss, user, action, details) {
  const logSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
  if (logSheet.getLastRow() === 0) logSheet.appendRow(["Data", "Usuario", "Acao", "Detalhes"]);
  logSheet.appendRow([new Date(), user, action, details]);
}
