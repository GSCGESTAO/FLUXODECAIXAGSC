
  /**
  * GSC FLUXO DE CAIXA - BACKEND BRIDGE
  * 
  * INSTRUÇÕES:
  * 1. Crie uma nova Planilha Google.
  * 2. Renomeie as abas: "Estabelecimentos", "Transacoes", "Usuarios".
  * 3. Aba "Usuarios" cabeçalho: ID | Email | Cargo
  * 4. Aba "Estabelecimentos" cabeçalho: ID | Nome | EmailResponsavel
  * 5. Aba "Transacoes" cabeçalho: ID | Data | Timestamp | EstabelecimentoID | Tipo | Valor | Descricao | Observacoes | Status | Usuario
  */

  function doGet(e) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Get Establishments
    const estSheet = ss.getSheetByName("Estabelecimentos");
    const estValues = estSheet.getDataRange().getValues();
    const establishments = estValues.slice(1).map(row => ({
      id: String(row[0]),
      name: String(row[1]),
      responsibleEmail: String(row[2]).trim()
    }));

    // 2. Get Authorized Users
    const userSheet = ss.getSheetByName("Usuarios");
    let authorizedUsers = [];
    if (userSheet) {
      const userValues = userSheet.getDataRange().getValues();
      authorizedUsers = userValues.slice(1)
        .filter(row => row[1]) // Filtra linhas vazias
        .map(row => ({
          email: String(row[1]).toLowerCase().trim(),
          role: String(row[2])
        }));
    }

    // 3. Get Transactions
    const transSheet = ss.getSheetByName("Transacoes");
    const transValues = transSheet.getDataRange().getValues();
    const transactions = transValues.slice(1).map(row => {
      let dateStr = row[1];
      if (row[1] instanceof Date) {
        dateStr = row[1].toISOString().split('T')[0];
      }
      
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

    const output = {
      establishments: establishments,
      authorizedUsers: authorizedUsers,
      transactions: transactions
    };

    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  }

  function doPost(e) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const transSheet = ss.getSheetByName("Transacoes");
      const data = JSON.parse(e.postData.contents);
      
      transSheet.appendRow([
        data.id,
        data.date,
        data.timestamp,
        data.establishmentId,
        data.type,
        data.amount,
        data.description,
        data.observations || "",
        data.status,
        data.user
      ]);

      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "id": data.id }))
        .setMimeType(ContentService.MimeType.JSON);
        
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  function setupSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    let userSheet = ss.getSheetByName("Usuarios");
    if (!userSheet) {
      userSheet = ss.insertSheet("Usuarios");
      userSheet.appendRow(["ID", "Email", "Cargo"]);
      userSheet.appendRow(["1", "seu-email@gmail.com", "Admin"]);
    }

    let estSheet = ss.getSheetByName("Estabelecimentos");
    if (!estSheet) {
      estSheet = ss.insertSheet("Estabelecimentos");
      estSheet.appendRow(["ID", "Nome", "EmailResponsavel"]);
    }
    
    let transSheet = ss.getSheetByName("Transacoes");
    if (!transSheet) {
      transSheet = ss.insertSheet("Transacoes");
      transSheet.appendRow(["ID", "Data", "Timestamp", "EstabelecimentoID", "Tipo", "Valor", "Descricao", "Observacoes", "Status", "Usuario"]);
    }
  }
