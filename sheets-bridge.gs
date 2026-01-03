
/**
 * GSC FLUXO DE CAIXA - BACKEND BRIDGE v2.3
 * Suporte a Configurações Globais e Auditoria Full
 */

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Get Establishments
  const estSheet = ss.getSheetByName("Estabelecimentos") || ss.insertSheet("Estabelecimentos");
  const estValues = estSheet.getDataRange().getValues();
  const establishments = estValues.length > 1 ? estValues.slice(1).map(row => ({
    id: String(row[0]),
    name: String(row[1]),
    responsibleEmail: String(row[2])
  })) : [];

  // 2. Get Authorized Users
  let userSheet = ss.getSheetByName("Usuarios") || ss.insertSheet("Usuarios");
  const userValues = userSheet.getDataRange().getValues();
  const authorizedUsers = userValues.length > 1 ? userValues.slice(1)
      .filter(row => row[1] && String(row[1]).includes("@"))
      .map(row => ({
        email: String(row[1]).toLowerCase().trim(),
        role: String(row[2]) || 'Operador'
      })) : [];

  // 3. Get Transactions
  const transSheet = ss.getSheetByName("Transacoes") || ss.insertSheet("Transacoes");
  const transValues = transSheet.getDataRange().getValues();
  let transactions = [];
  if (transValues.length > 1) {
    transactions = transValues.slice(1).map(row => {
      let dateStr = row[1];
      if (row[1] instanceof Date) dateStr = row[1].toISOString().split('T')[0];
      return {
        id: String(row[0]),
        date: String(dateStr),
        timestamp: String(row[2]),
        establishmentId: String(row[3]),
        type: String(row[4]),
        amount: Number(row[5]),
        description: String(row[6]),
        observations: String(row[7]),
        status: String(row[8]),
        user: String(row[9])
      };
    }).reverse();
  }

  // 4. Get Multi-scope Notes
  const notesSheet = ss.getSheetByName("Anotacoes") || ss.insertSheet("Anotacoes");
  const notesValues = notesSheet.getDataRange().getValues();
  const notesMap = {};
  if (notesValues.length > 1) {
    notesValues.slice(1).forEach(row => { notesMap[String(row[0])] = String(row[1]); });
  }

  // 5. Get System Settings
  const settingsSheet = ss.getSheetByName("Configuracoes") || ss.insertSheet("Configuracoes");
  const settingsRow = settingsSheet.getRange("A2").getValue();
  let settings = null;
  try { settings = JSON.parse(settingsRow); } catch(e) { settings = {}; }

  const output = {
    establishments: establishments,
    authorizedUsers: authorizedUsers,
    transactions: transactions,
    notes: notesMap,
    settings: settings
  };

  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const user = payload.user || "Unknown";

    if (action === 'ADD_TRANSACTION') {
      const sheet = ss.getSheetByName("Transacoes") || ss.insertSheet("Transacoes");
      sheet.appendRow([payload.id, payload.date, payload.timestamp, payload.establishmentId, payload.type, payload.amount, payload.description, payload.observations || "", payload.status, payload.user]);
      logActivity(ss, user, "ADD_TRANSACTION", `Valor: ${payload.amount}, Desc: ${payload.description}`);
    } 
    else if (action === 'EDIT_TRANSACTION') {
      const sheet = ss.getSheetByName("Transacoes");
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === payload.id) {
          sheet.getRange(i + 1, 1, 1, 10).setValues([[payload.id, payload.date, payload.timestamp, payload.establishmentId, payload.type, payload.amount, payload.description, payload.observations || "", payload.status, payload.user]]);
          logActivity(ss, user, "EDIT_TRANSACTION", `ID: ${payload.id}, Novo Valor: ${payload.amount}`);
          break;
        }
      }
    }
    else if (action === 'UPDATE_NOTE') {
      const sheet = ss.getSheetByName("Anotacoes") || ss.insertSheet("Anotacoes");
      const entityId = payload.entityId || "GENERAL";
      const data = sheet.getDataRange().getValues();
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === entityId) { sheet.getRange(i + 1, 2).setValue(payload.notes); found = true; break; }
      }
      if (!found) sheet.appendRow([entityId, payload.notes]);
      logActivity(ss, user, "UPDATE_NOTE", `Scope: ${entityId}`);
    }
    else if (action === 'UPDATE_SETTINGS') {
      const sheet = ss.getSheetByName("Configuracoes") || ss.insertSheet("Configuracoes");
      sheet.getRange("A1").setValue("JSON_SETTINGS");
      sheet.getRange("A2").setValue(JSON.stringify(payload.settings));
      logActivity(ss, user, "UPDATE_SETTINGS", "Configurações Globais Atualizadas");
    }
    else if (action === 'ADD_USER') {
      const sheet = ss.getSheetByName("Usuarios") || ss.insertSheet("Usuarios");
      sheet.appendRow([Utilities.getUuid(), payload.email.toLowerCase().trim(), payload.role || 'Operador']);
      logActivity(ss, user, "ADD_USER", `Novo Usuário: ${payload.email}`);
    }

    return ContentService.createTextOutput(JSON.stringify({ "status": "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function logActivity(ss, user, action, details) {
  const logSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
  if (logSheet.getLastRow() === 0) logSheet.appendRow(["Data/Hora", "Usuario", "Acao", "Detalhes"]);
  logSheet.appendRow([new Date(), user, action, details]);
}
