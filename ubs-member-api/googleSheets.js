const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// In-Memory Fallback Data Store for AI Studio environment
const memoryStore = {
    mst_member: [
        {
            _id: '1',
            memberId: '1',
            name: 'Urvesh Patel',
            gender: 'Male',
            relation: 'Self',
            dob: '1990-01-01',
            dateOfBirth: '1990-01-01',
            marriagestatus: 'Married',
            profession: 'Business',
            designation: 'Director',
            address: 'Alkapuri',
            companyName: 'UBS Ltd',
            companyAddress: 'Vadodara',
            mobile: '9876543210',
            mobile_verified: 'true',
            bloodGroup: 'O+',
            city: 'Vadodara',
            last_updated: new Date().toISOString()
        },
        {
            _id: '2',
            memberId: '1',
            name: 'Pooja Patel',
            gender: 'Female',
            relation: 'Wife',
            dob: '1992-04-12',
            dateOfBirth: '1992-04-12',
            marriagestatus: 'Married',
            profession: 'Teacher',
            designation: 'Senior Educator',
            address: 'Alkapuri',
            companyName: 'St. Xavier School',
            companyAddress: 'Vadodara',
            mobile: '9876543211',
            mobile_verified: 'true',
            bloodGroup: 'B+',
            city: 'Vadodara',
            last_updated: new Date().toISOString()
        },
        {
            _id: '3',
            memberId: '1',
            name: 'Kavy Patel',
            gender: 'Male',
            relation: 'Son',
            dob: '2018-08-20',
            dateOfBirth: '2018-08-20',
            marriagestatus: 'Unmarried',
            profession: 'Student',
            designation: 'Student',
            address: 'Alkapuri',
            companyName: '-',
            companyAddress: 'Vadodara',
            mobile: '9876543212',
            mobile_verified: 'false',
            bloodGroup: 'O+',
            city: 'Vadodara',
            last_updated: new Date().toISOString()
        },
        {
            _id: '4',
            memberId: '2',
            name: 'Ramesh Shah',
            gender: 'Male',
            relation: 'Self',
            dob: '1982-11-05',
            dateOfBirth: '1982-11-05',
            marriagestatus: 'Married',
            profession: 'Service',
            designation: 'Senior Manager',
            address: 'Gotri Road',
            companyName: 'L&T India',
            companyAddress: 'Vadodara',
            mobile: '9898011223',
            mobile_verified: 'true',
            bloodGroup: 'A+',
            city: 'Vadodara',
            last_updated: new Date().toISOString()
        },
        {
            _id: '5',
            memberId: '2',
            name: 'Meena Shah',
            gender: 'Female',
            relation: 'Wife',
            dob: '1985-03-22',
            dateOfBirth: '1985-03-22',
            marriagestatus: 'Married',
            profession: 'Doctor',
            designation: 'Physician',
            address: 'Gotri Road',
            companyName: 'City Hospital',
            companyAddress: 'Vadodara',
            mobile: '9898011224',
            mobile_verified: 'true',
            bloodGroup: 'AB+',
            city: 'Vadodara',
            last_updated: new Date().toISOString()
        },
        {
            _id: '354',
            memberId: '354',
            name: 'Anil Purohit',
            gender: 'Male',
            relation: 'Self',
            dob: '1962-05-10',
            dateOfBirth: '1962-05-10',
            marriagestatus: 'Married',
            profession: 'Business',
            designation: 'Senior Consultant',
            address: 'Alkapuri / Gotri Road',
            companyName: 'UBS Trust',
            companyAddress: 'Vadodara',
            mobile: '9825012354',
            mobile_verified: 'true',
            bloodGroup: 'B+',
            city: 'Vadodara',
            last_updated: new Date().toISOString()
        },
        {
            _id: '355',
            memberId: '354',
            name: 'Geeta Anil Purohit',
            gender: 'Female',
            relation: 'Wife',
            dob: '1965-08-15',
            dateOfBirth: '1965-08-15',
            marriagestatus: 'Married',
            profession: 'Homemaker',
            designation: '-',
            address: 'Vadodara',
            companyName: '-',
            companyAddress: 'Vadodara',
            mobile: '9825012355',
            mobile_verified: 'true',
            bloodGroup: 'O+',
            city: 'Vadodara',
            last_updated: new Date().toISOString()
        },
        {
            _id: '356',
            memberId: '354',
            name: 'Urvesh Purohit',
            gender: 'Male',
            relation: 'Son',
            dob: '1990-01-01',
            dateOfBirth: '1990-01-01',
            marriagestatus: 'Married',
            profession: 'Software Engineer',
            designation: 'Lead Architect',
            address: 'Vadodara',
            companyName: 'Tech Services',
            companyAddress: 'Vadodara',
            mobile: '9876543210',
            mobile_verified: 'true',
            bloodGroup: 'O+',
            city: 'Vadodara',
            last_updated: new Date().toISOString()
        },
        {
            _id: '357',
            memberId: '354',
            name: 'Namrata Urvesh Purohit',
            gender: 'Female',
            relation: 'Daughter-in-law',
            dob: '1992-04-12',
            dateOfBirth: '1992-04-12',
            marriagestatus: 'Married',
            profession: 'Educator',
            designation: 'Teacher',
            address: 'Vadodara',
            companyName: '-',
            companyAddress: 'Vadodara',
            mobile: '9876543211',
            mobile_verified: 'true',
            bloodGroup: 'B+',
            city: 'Vadodara',
            last_updated: new Date().toISOString()
        },
        {
            _id: '358',
            memberId: '354',
            name: 'Jai Anilkumar Purohit',
            gender: 'Male',
            relation: 'Son',
            dob: '1993-07-18',
            dateOfBirth: '1993-07-18',
            marriagestatus: 'Married',
            profession: 'Business',
            designation: 'Operations Manager',
            address: 'Vadodara',
            companyName: 'Purohit Enterprises',
            companyAddress: 'Vadodara',
            mobile: '9825012358',
            mobile_verified: 'true',
            bloodGroup: 'A+',
            city: 'Vadodara',
            last_updated: new Date().toISOString()
        },
        {
            _id: '359',
            memberId: '354',
            name: 'Zalak Jay Purohit',
            gender: 'Female',
            relation: 'Daughter-in-law',
            dob: '1995-11-25',
            dateOfBirth: '1995-11-25',
            marriagestatus: 'Married',
            profession: 'Designer',
            designation: 'Creative Lead',
            address: 'Vadodara',
            companyName: '-',
            companyAddress: 'Vadodara',
            mobile: '9825012359',
            mobile_verified: 'true',
            bloodGroup: 'AB+',
            city: 'Vadodara',
            last_updated: new Date().toISOString()
        },
        {
            _id: '360',
            memberId: '354',
            name: 'Pranshu Jay Purohit',
            gender: 'Male',
            relation: 'Grandson',
            dob: '2020-03-10',
            dateOfBirth: '2020-03-10',
            marriagestatus: 'Unmarried',
            profession: 'Child',
            designation: 'Student',
            address: 'Vadodara',
            companyName: '-',
            companyAddress: 'Vadodara',
            mobile: '9825012358',
            mobile_verified: 'false',
            bloodGroup: 'A+',
            city: 'Vadodara',
            last_updated: new Date().toISOString()
        }
    ],
    mst_subhechhak: [
        {
            _id: '101',
            memberId: '101',
            name: 'Ramesh Shah',
            gender: 'Male',
            relation: 'Self',
            dob: '1985-05-15',
            dateOfBirth: '1985-05-15',
            marriagestatus: 'Married',
            profession: 'Service',
            designation: 'Manager',
            address: 'Gotri',
            companyName: 'Tech Corp',
            companyAddress: 'Vadodara',
            mobile: '9123456789',
            mobile_verified: 'true',
            bloodGroup: 'A+',
            city: 'Vadodara',
            last_updated: new Date().toISOString()
        }
    ],
    donation: [
        {
            id: '1',
            memberId: '1',
            amount: '5000',
            name: 'Urvesh Patel',
            mobile: '9876543210',
            paymentType: 'upi',
            paymentNo: 'UPI123456',
            paymentDate: new Date().toISOString().slice(0, 10),
            city: 'Vadodara',
            donationType: 'UBS'
        }
    ],
    configuration: [
        { key: 'active', value: 'true' },
        { key: 'adminPin', value: '2026' },
        { key: 'viewMembersPin', value: '1111' },
        { key: 'donationInvoicePin', value: '2222' },
        { key: 'viewOnlyPin', value: '3333' }
    ],
    mst_relation: [
        { relation: 'Self' },
        { relation: 'Wife' },
        { relation: 'Son' },
        { relation: 'Daughter' },
        { relation: 'Father' },
        { relation: 'Mother' }
    ],
    mst_bloodgroup: [
        { bloodGroup: 'A+' },
        { bloodGroup: 'A-' },
        { bloodGroup: 'B+' },
        { bloodGroup: 'B-' },
        { bloodGroup: 'O+' },
        { bloodGroup: 'O-' },
        { bloodGroup: 'AB+' },
        { bloodGroup: 'AB-' }
    ],
    mst_profession: [
        { profession: 'Business' },
        { profession: 'Job' },
        { profession: 'Doctor' },
        { profession: 'Engineer' },
        { profession: 'CA' },
        { profession: 'Other' }
    ],
    mst_marriagestatus: [
        { marriageStatus: 'Married' },
        { marriageStatus: 'Unmarried' }
    ],
    mst_city: [
        { city: 'Vadodara' },
        { city: 'Ahmedabad' },
        { city: 'Surat' },
        { city: 'Rajkot' },
        { city: 'Mumbai' }
    ],
    mst_memberrelationship: [
        { relationshipId: '1', memberId: '1', relatedMemberId: '2', relationshipType: 'Spouse', isActive: 'true', createdDate: new Date().toISOString() },
        { relationshipId: '2', memberId: '2', relatedMemberId: '1', relationshipType: 'Spouse', isActive: 'true', createdDate: new Date().toISOString() },
        { relationshipId: '3', memberId: '3', relatedMemberId: '1', relationshipType: 'Father', isActive: 'true', createdDate: new Date().toISOString() },
        { relationshipId: '4', memberId: '3', relatedMemberId: '2', relationshipType: 'Mother', isActive: 'true', createdDate: new Date().toISOString() },
        { relationshipId: '5', memberId: '354', relatedMemberId: '355', relationshipType: 'Spouse', isActive: 'true', createdDate: new Date().toISOString() },
        { relationshipId: '6', memberId: '355', relatedMemberId: '354', relationshipType: 'Spouse', isActive: 'true', createdDate: new Date().toISOString() },
        { relationshipId: '7', memberId: '356', relatedMemberId: '354', relationshipType: 'Father', isActive: 'true', createdDate: new Date().toISOString() },
        { relationshipId: '8', memberId: '356', relatedMemberId: '357', relationshipType: 'Spouse', isActive: 'true', createdDate: new Date().toISOString() },
        { relationshipId: '9', memberId: '358', relatedMemberId: '354', relationshipType: 'Father', isActive: 'true', createdDate: new Date().toISOString() },
        { relationshipId: '10', memberId: '358', relatedMemberId: '359', relationshipType: 'Spouse', isActive: 'true', createdDate: new Date().toISOString() },
        { relationshipId: '11', memberId: '360', relatedMemberId: '358', relationshipType: 'Father', isActive: 'true', createdDate: new Date().toISOString() }
    ]
};

class GoogleSheetsService {
    constructor() {
        this.spreadsheetId = process.env.GOOGLE_SHEET_ID || process.env.SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID || process.env.SHEET_ID || '1jqjxAuTaX-cYJxbKknbMcqTZ4hws0g9xlY4GwmOVIBQ';
        this.cache = {};
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes default TTL
        
        try {
            const authConfig = {
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            };

            let serviceAccountJson = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
            if ((serviceAccountJson.startsWith("'") && serviceAccountJson.endsWith("'")) || 
                (serviceAccountJson.startsWith('"') && serviceAccountJson.endsWith('"'))) {
                serviceAccountJson = serviceAccountJson.substring(1, serviceAccountJson.length - 1).trim();
            }

            const tryParseJson = (str) => {
                if (!str) return null;
                try {
                    const parsed = JSON.parse(str);
                    if (parsed && typeof parsed === 'object') return parsed;
                } catch (e) {
                    // Try base64 decoding if direct JSON parse fails
                    try {
                        const decoded = Buffer.from(str, 'base64').toString('utf8').trim();
                        if (decoded.startsWith('{')) {
                            const parsed = JSON.parse(decoded);
                            if (parsed && typeof parsed === 'object') return parsed;
                        }
                    } catch (e2) {}
                }
                return null;
            };

            let parsedCreds = tryParseJson(serviceAccountJson);

            let googleAppCreds = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
            if (!parsedCreds && googleAppCreds) {
                if ((googleAppCreds.startsWith("'") && googleAppCreds.endsWith("'")) || 
                    (googleAppCreds.startsWith('"') && googleAppCreds.endsWith('"'))) {
                    googleAppCreds = googleAppCreds.substring(1, googleAppCreds.length - 1).trim();
                }
                if (googleAppCreds.startsWith('{') || !fs.existsSync(googleAppCreds)) {
                    parsedCreds = tryParseJson(googleAppCreds);
                }
            }

            const defaultKeyPath = path.join(__dirname, 'google-credentials.json');
            if (fs.existsSync(defaultKeyPath)) {
                try {
                    const localJson = JSON.parse(fs.readFileSync(defaultKeyPath, 'utf8'));
                    if (localJson && localJson.private_key) {
                        localJson.private_key = localJson.private_key.replaceAll('\\n', '\n');
                        parsedCreds = localJson;
                    }
                } catch(e) {
                    authConfig.keyFile = defaultKeyPath;
                }
            }

            if (parsedCreds) {
                if (parsedCreds.private_key) {
                    let pk = parsedCreds.private_key;
                    while (pk.includes('\\n')) {
                        pk = pk.replace(/\\n/g, '\n');
                    }
                    parsedCreds.private_key = pk;
                }
                authConfig.credentials = parsedCreds;
                console.log(`Successfully loaded Google Service Account credentials (${parsedCreds.client_email}).`);
            } else if (googleAppCreds && fs.existsSync(googleAppCreds)) {
                authConfig.keyFile = googleAppCreds;
            }

            if (authConfig.credentials || authConfig.keyFile) {
                this.auth = new google.auth.GoogleAuth(authConfig);
                this.sheets = google.sheets({ version: 'v4', auth: this.auth });
            } else {
                console.warn('[AI Studio] Google Sheets credentials not configured — falling back to in-memory store.');
                this.sheets = null;
            }
        } catch (err) {
            console.warn('[AI Studio] Failed to init Google Sheets auth:', err.message);
            this.sheets = null;
        }
    }

    _clearCache(sheetName) {
        if (!sheetName) {
            this.cache = {};
        } else {
            delete this.cache[sheetName];
        }
    }

    async ensureHeaders(sheetName, keys) {
        if (!this.sheets || !this.spreadsheetId) return;
        try {
            const headersResponse = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!1:1`,
            });
            let headers = headersResponse.data.values ? headersResponse.data.values[0] : [];
            const missing = keys.filter(k => k && !headers.includes(k));
            
            if (missing.length > 0) {
                headers = [...headers, ...missing];
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `${sheetName}!1:1`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [headers] },
                });
                this._clearCache(sheetName);
            }
        } catch (error) {
            console.warn(`[AI Studio] Error ensuring headers in ${sheetName}:`, error.message);
        }
    }

    async getRows(sheetName, forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this.cache[sheetName] && (now - this.cache[sheetName].timestamp < this.cacheTTL)) {
            return this.cache[sheetName].data;
        }

        if (!memoryStore[sheetName]) {
            memoryStore[sheetName] = [];
        }

        // Try Official Google Sheets API if initialized
        if (this.sheets && this.spreadsheetId) {
            try {
                const response = await this.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: `${sheetName}!A:Z`,
                });
                const rows = response.data.values;
                if (rows && rows.length > 1) {
                    const headers = rows[0];
                    const data = rows.slice(1).map(row => {
                        const obj = {};
                        headers.forEach((header, index) => {
                            obj[header] = row[index];
                        });
                        return obj;
                    });

                    this.cache[sheetName] = { timestamp: now, data: data };
                    memoryStore[sheetName] = data;
                    return data;
                }
            } catch (error) {
                console.warn(`[AI Studio] Google Sheets API unavailable for ${sheetName} (${error.message}). Trying public CSV fetch...`);
            }
        }

        // Fallback: Try public Google Sheet CSV export if shared as "Anyone with the link"
        if (this.spreadsheetId) {
            try {
                const publicData = await this._fetchPublicCsv(sheetName);
                if (publicData && publicData.length > 0) {
                    console.log(`[AI Studio] Successfully retrieved ${publicData.length} records via public CSV export for ${sheetName}`);
                    this.cache[sheetName] = { timestamp: now, data: publicData };
                    memoryStore[sheetName] = publicData;
                    return publicData;
                }
            } catch (err) {
                console.warn(`[AI Studio] Public CSV export failed for ${sheetName}:`, err.message);
            }
        }

        return memoryStore[sheetName];
    }

    async _fetchPublicCsv(sheetName) {
        if (!this.spreadsheetId) return null;
        try {
            const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const text = await res.text();
            if (!text || text.includes('<!DOCTYPE html>') || text.includes('show-login-page')) {
                return null; // Sheet is private
            }
            
            const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
            if (lines.length < 2) return [];
            
            const parseLine = (line) => {
                const values = [];
                let cur = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const c = line[i];
                    if (c === '"') {
                        if (inQuotes && line[i + 1] === '"') {
                            cur += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (c === ',' && !inQuotes) {
                        values.push(cur);
                        cur = '';
                    } else {
                        cur += c;
                    }
                }
                values.push(cur);
                return values;
            };

            const headers = parseLine(lines[0]);
            const rows = lines.slice(1).map(line => {
                const vals = parseLine(line);
                const obj = {};
                headers.forEach((h, idx) => {
                    if (h) obj[h] = vals[idx] !== undefined ? vals[idx] : '';
                });
                return obj;
            });
            return rows;
        } catch (e) {
            return null;
        }
    }

    async addRow(sheetName, data) {
        this._clearCache(sheetName);
        return this.addRows(sheetName, [data]);
    }

    async addRows(sheetName, dataArray) {
        this._clearCache(sheetName);
        if (!memoryStore[sheetName]) memoryStore[sheetName] = [];
        dataArray.forEach(item => memoryStore[sheetName].push({ ...item }));

        if (!this.sheets || !this.spreadsheetId) return;

        try {
            const headersResponse = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!1:1`,
            });
            const headers = headersResponse.data.values ? headersResponse.data.values[0] : Object.keys(dataArray[0] || {});
            const rowsToAppend = dataArray.map(data => headers.map(header => data[header] ?? ''));

            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:A`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: rowsToAppend },
            });
        } catch (error) {
            console.warn(`[AI Studio] Google Sheets addRows warning for ${sheetName}:`, error.message);
        }
    }

    async updateRow(sheetName, idColumn, idValue, data) {
        this._clearCache(sheetName);
        if (memoryStore[sheetName]) {
            const index = memoryStore[sheetName].findIndex(item => {
                const val = item[idColumn] !== undefined ? item[idColumn] : (item._id || item.Id || item.id || item.ID);
                return String(val) === String(idValue);
            });
            if (index !== -1) {
                memoryStore[sheetName][index] = { ...memoryStore[sheetName][index], ...data };
            }
        }

        if (!this.sheets || !this.spreadsheetId) return;

        try {
            const rowsResponse = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:Z`,
            });
            const rows = rowsResponse.data.values;
            if (!rows || rows.length === 0) return;
            const headers = rows[0];
            let idIndex = headers.indexOf(idColumn);
            if (idIndex === -1) {
                idIndex = headers.findIndex(h => h.toLowerCase() === idColumn.toLowerCase() || h.toLowerCase() === '_id' || h.toLowerCase() === 'id');
            }
            if (idIndex === -1) return;

            const rowIndex = rows.findIndex(row => String(row[idIndex]) === String(idValue));
            if (rowIndex === -1) return;

            const updatedRow = headers.map(header => data[header] !== undefined ? data[header] : (rows[rowIndex][headers.indexOf(header)] || ''));

            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A${rowIndex + 1}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [updatedRow] },
            });
        } catch (error) {
            console.warn(`[AI Studio] Google Sheets updateRow warning for ${sheetName}:`, error.message);
        }
    }

    async deleteRow(sheetName, idColumn, idValue) {
        this._clearCache(sheetName);
        if (memoryStore[sheetName]) {
            memoryStore[sheetName] = memoryStore[sheetName].filter(item => {
                const val = item[idColumn] !== undefined ? item[idColumn] : (item._id || item.Id || item.id || item.ID);
                return String(val) !== String(idValue);
            });
        }

        if (!this.sheets || !this.spreadsheetId) return;

        try {
            const rowsResponse = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:Z`,
            });
            const rows = rowsResponse.data.values;
            if (!rows || rows.length === 0) return;
            const headers = rows[0];
            let idIndex = headers.indexOf(idColumn);
            if (idIndex === -1) {
                idIndex = headers.findIndex(h => h.toLowerCase() === idColumn.toLowerCase() || h.toLowerCase() === '_id' || h.toLowerCase() === 'id');
            }
            if (idIndex === -1) return;

            const rowIndex = rows.findIndex(row => String(row[idIndex]) === String(idValue));
            if (rowIndex === -1) return;

            const sheetIdResponse = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });
            const sheet = sheetIdResponse.data.sheets.find(s => s.properties.title === sheetName);
            if (!sheet) return;
            const sheetId = sheet.properties.sheetId;

            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1
                            }
                        }
                    }]
                }
            });
        } catch (error) {
            console.warn(`[AI Studio] Google Sheets deleteRow warning for ${sheetName}:`, error.message);
        }
    }

    async createSheetIfNotExists(title) {
        if (!this.sheets || !this.spreadsheetId) return;
        try {
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });
            const sheet = response.data.sheets.find(s => s.properties.title === title);
            
            if (!sheet) {
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    resource: {
                        requests: [{
                            addSheet: {
                                properties: { title }
                            }
                        }]
                    }
                });
            }
        } catch (error) {
            console.warn(`[AI Studio] createSheetIfNotExists warning for ${title}:`, error.message);
        }
    }

    async updateEntireSheet(sheetName, data) {
        this._clearCache(sheetName);
        memoryStore[sheetName] = data;
        if (!this.sheets || !this.spreadsheetId) return;

        try {
            await this.sheets.spreadsheets.values.clear({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:Z`,
            });

            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A1`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: data },
            });
        } catch (error) {
            console.warn(`[AI Studio] updateEntireSheet warning for ${sheetName}:`, error.message);
        }
    }

    async batchUpdateRows(sheetName, updates) {
        if (!updates || updates.length === 0) return;
        this._clearCache(sheetName);

        if (memoryStore[sheetName]) {
            updates.forEach(u => {
                const index = memoryStore[sheetName].findIndex(item => String(item[u.idColumn]) === String(u.idValue));
                if (index !== -1) {
                    memoryStore[sheetName][index] = { ...memoryStore[sheetName][index], ...u.data };
                }
            });
        }

        if (!this.sheets || !this.spreadsheetId) return;

        try {
            const rowsResponse = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:Z`,
            });
            const rows = rowsResponse.data.values;
            if (!rows || rows.length === 0) return;
            const headers = rows[0];
            
            const dataToUpdate = updates.map(update => {
                const { idColumn, idValue, data } = update;
                const idIndex = headers.indexOf(idColumn);
                if (idIndex === -1) return null;
                
                const rowIndex = rows.findIndex(row => row[idIndex] === idValue.toString());
                if (rowIndex === -1) return null;

                const updatedRow = headers.map(header => data[header] !== undefined ? data[header] : '');
                return {
                    range: `${sheetName}!A${rowIndex + 1}`,
                    values: [updatedRow]
                };
            }).filter(u => u !== null);

            if (dataToUpdate.length > 0) {
                await this.sheets.spreadsheets.values.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    resource: {
                        valueInputOption: 'USER_ENTERED',
                        data: dataToUpdate
                    }
                });
            }
        } catch (error) {
            console.warn(`[AI Studio] batchUpdateRows warning for ${sheetName}:`, error.message);
        }
    }
}

module.exports = new GoogleSheetsService();
