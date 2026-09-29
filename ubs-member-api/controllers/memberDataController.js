const googleSheets = require('../googleSheets');
const googleContacts = require('../googleContactsService');
const path = require('path');
const fs = require('fs');
const { getBrowser } = require('../browserManager');
const ExcelJS = require('exceljs');
const chromium = require('@sparticuz/chromium');

// Load logo once and convert to Base64 for embedding
let logoBase64 = '';
const candidateLogoPaths = [
    path.join(__dirname, '..', 'template', 'logo.png'),
    path.join(__dirname, '..', '..', 'ubs-member-ui', 'ubs_member_data_flutter', 'assets', 'logo.png'),
    path.join(process.cwd(), 'ubs-member-api', 'template', 'logo.png'),
    path.join(process.cwd(), 'ubs-member-ui', 'ubs_member_data_flutter', 'assets', 'logo.png')
];
for (const p of candidateLogoPaths) {
    if (fs.existsSync(p)) {
        try {
            const logoBuffer = fs.readFileSync(p);
            logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
            break;
        } catch (error) {}
    }
}

// Fallback HTML invoice template if file is missing
const getInvoiceTemplateHtml = async () => {
    const candidatePaths = [
        path.join(__dirname, '..', 'template', 'Invoice.html'),
        path.join(__dirname, '..', '..', 'ubs-member-ui', 'ubs-member-data-ui', 'template', 'Invoice.html'),
        path.join(process.cwd(), 'ubs-member-api', 'template', 'Invoice.html'),
        path.join(process.cwd(), 'ubs-member-ui', 'ubs-member-data-ui', 'template', 'Invoice.html')
    ];
    for (const p of candidatePaths) {
        try {
            if (fs.existsSync(p)) {
                const content = await fs.promises.readFile(p, 'utf8');
                if (content && content.trim().length > 0) return content;
            }
        } catch (e) {}
    }
    return `<!DOCTYPE html>
<html lang="gu">
<head>
    <meta charset="UTF-8" />
    <style>
        body { font-family: 'Noto Sans Gujarati', Arial, sans-serif; margin: 0; padding: 30px; background: #fdfdfd; }
        .receipt-box { max-width: 800px; margin: auto; padding: 10px 20px; border: 2px solid #444; border-radius: 12px; background: white; }
        .logo { text-align: center; margin-bottom: 20px; }
        .logo img { width: 80px; }
        .header { text-align: center; margin-bottom: 15px; }
        .header h2 { margin: 8px 0; font-size: 24px; font-weight: bold; }
        .header h4 { margin: 4px 0; font-size: 15px; color: #555; }
        .info-section { font-size: 16px; line-height: 1.8; margin-bottom: 20px; }
        .info-section span.label { font-weight: bold; }
        .highlight-box { margin: 25px 0; padding: 12px 20px; font-size: 18px; border: 2px dashed #888; border-radius: 8px; background-color: #f5f5f5; }
        .footer-note { margin-top: 30px; font-size: 14px; font-style: italic; text-align: center; }
        .signature { text-align: right; margin-top: 40px; font-weight: bold; }
        .payment-section { padding: 3px; }
    </style>
</head>
<body>
    <div class="receipt-box">
        <div class="logo">
            <img src="#logo#" alt="Trust Logo" />
        </div>
        <div class="header">
            <h2>#trustName#</h2>
            <h4>રજી. નં.: એ / 330 / વડોદરા | Registered for 80G</h4>
            <h4>(Unique No.: ABKTS7291QF20251)</h4>
        </div>
        <div class="info-section" style="text-align: right; margin-top: -10px; margin-bottom: 10px;">
            <span class="label">તારીખ:</span> #paid-date#
        </div>
        <div class="info-section">
            <div><span class="label">કાર્યાલય:</span> ૧૦૫, કૃપા એપાર્ટમેન્ટ, જૂલીબાઈ પાર્ક, વી.આઈ.પી. રોડ, કોરેલીબાગ, વડોદરા-૧૮</div>
            <div><span class="label">ફોન:</span> ૯૮૨૪૯ ૪૯૬૮૩</div>
        </div>
        <div class="info-section">
            <div><span class="label">રસીદ નંબર:</span> #receiptNo#</div>
            <div><span class="label">સભ્યપદ નંબર:</span> #memberId#</div>
            <div><span class="label">શ્રીમાન / શ્રીમતી:</span> #name#</div>
            <div><span class="label">ઠે.:</span> #city#</div>
            <div><span class="label">ફોન નંબર:</span> #mobile#</div>
        </div>
        <div class="info-section">
            આપશ્રી તરફથી <strong>માઁ ના પાટોત્સવ / નવરાત્રી મહોત્સવ</strong> તથા અન્ય સામાજિક પ્રસંગે આપેલ દાનભેટ અમને પ્રાપ્ત થયેલ છે.
        </div>
        <div class="highlight-box">
            <div class="payment-section">રૂ. <strong>#amount#</strong> - <strong>#paymentType#</strong> મળ્યા છે.</div>
            <div class="payment-section">#paymentType-1#  <strong>#paymentNo#</strong></div>
        </div>
        <div class="footer-note">(ચેક સ્વીકૃતિ શરતે)</div>
        <div class="signature">શ્રી ઉનેવાળ બ્રહ્મસમાજ સેવા ટ્રસ્ટ, વડોદરા વતી</div>
    </div>
</body>
</html>`;
};

// Helper to format Date (consistent with previous implementation)
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 10);
    } catch (e) {
        return '';
    }
};

// Helper for compare sorting
const compare = (v1, v2) => {
    if (v1 == null) v1 = '';
    if (v2 == null) v2 = '';

    if (typeof v1 === 'number' && typeof v2 === 'number') {
        return v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
    }

    const str1 = String(v1);
    const str2 = String(v2);

    const num1 = parseFloat(str1);
    const num2 = parseFloat(str2);

    if (!isNaN(num1) && !isNaN(num2) && /^\d+$/.test(str1) && /^\d+$/.test(str2)) {
        return num1 < num2 ? -1 : num1 > num2 ? 1 : 0;
    }

    return str1.localeCompare(str2, undefined, { numeric: true, sensitivity: 'base' });
};

// Helper for unique values (replaces SELECT DISTINCT)
const getUniqueValues = (rows, column) => {
    const values = rows.map(row => row[column]).filter(v => v && v !== '');
    return [...new Set(values)].sort().map(v => ({ [column]: v }));
};

const SHEETS = {
    MEMBERS: 'mst_member',
    SHUBHECHHAK: 'mst_subhechhak',
    DONATION: 'donation',
    CONFIG: 'configuration',
    RELATION: 'mst_relation',
    MARRIAGE_STATUS: 'mst_marriagestatus',
    CITY: 'mst_city',
    PROFESSION: 'mst_profession',
    BLOODGROUP: 'mst_bloodgroup',
    RELATIONSHIP: 'mst_memberrelationship'
};

const ensureMasterValue = async (sheetName, header, value) => {
    if (!value || value === '' || value === 'null') return;
    try {
        const rows = await googleSheets.getRows(sheetName);
        const exists = rows.find(r => (r[header] || '').trim().toLowerCase() === value.trim().toLowerCase());
        if (!exists) {
            await googleSheets.addRow(sheetName, { [header]: value.trim() });
            console.log(`Added new master value "${value}" to ${sheetName}`);
        }
    } catch (e) {
        console.error(`Error ensuring master value in ${sheetName}:`, e.message);
    }
};

// Helper to safely get field from row
const getVal = (row, ...keys) => {
    if (!row) return '';
    for (let k of keys) {
        if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
    }
    return '';
};

// GET: api/MemberData
exports.getAllMembers = async (req, res) => {
    try {
        const [configRows, rows] = await Promise.all([
            googleSheets.getRows(SHEETS.CONFIG),
            googleSheets.getRows(SHEETS.MEMBERS)
        ]);
        const activeItem = configRows.find(c => (c.key || c.Key || '').toLowerCase() === 'active');
        const isActive = activeItem ? (activeItem.value || activeItem.Value || '').toLowerCase() !== 'false' : true;
        if (!isActive) {
            return res.json(req.query.paginate === 'false' ? [] : { data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 });
        }

        let formattedRows = rows.map(row => {
            const id = getVal(row, '_id', 'Id', 'id', 'ID');
            const memberId = getVal(row, 'memberId', 'Member Id', 'MemberId', 'Member_Id', 'member_id');
            const mobile = getVal(row, 'mobile', 'Mobile', 'phone', 'Phone');
            const mobileVerified = getVal(row, 'mobile_verified', 'MobileVerified', 'mobileVerified');
            return {
                "_id": id,
                "memberId": memberId,
                "name": getVal(row, 'name', 'Name'),
                "gender": getVal(row, 'gender', 'Gender'),
                "dateOfBirth": getVal(row, 'dateOfBirth', 'Date Of Birth', 'DateOfBirth', 'dob', 'DOB'),
                "dob": getVal(row, 'dob', 'DOB', 'Birth Date', 'BirthDate', 'dateOfBirth'),
                "relation": getVal(row, 'relation', 'Relation') || 'Self',
                "marriagestatus": getVal(row, 'marriagestatus', 'Married', 'Marriage Status'),
                "profession": getVal(row, 'profession', 'Profession'),
                "designation": getVal(row, 'designation', 'Designation'),
                "address": getVal(row, 'address', 'Address'),
                "companyName": getVal(row, 'companyName', 'Company', 'Company Name'),
                "companyAddress": getVal(row, 'companyAddress', 'Company Address', 'CompanyAddress'),
                "mobile": mobile,
                "mobile_verified": mobileVerified === 'true' || mobileVerified === true || mobileVerified === 'TRUE',
                "bloodGroup": getVal(row, 'bloodGroup', 'Blood Group', 'BloodGroup', 'bloodgroup'),
                "city": getVal(row, 'city', 'City'),
                "parentId": getVal(row, 'parentId', 'ParentId', 'parent_id', 'parentId'),
                "last_updated": getVal(row, 'last_updated', 'LastUpdated', 'lastUpdated') || '',
                "Id": id,
                "Member Id": memberId,
                "Gender": getVal(row, 'gender', 'Gender'),
                "Name": getVal(row, 'name', 'Name'),
                "Date Of Birth": getVal(row, 'dateOfBirth', 'Date Of Birth', 'DateOfBirth', 'dob', 'DOB'),
                "Birth Date": getVal(row, 'dob', 'DOB', 'Birth Date', 'BirthDate', 'dateOfBirth'),
                "Relation": getVal(row, 'relation', 'Relation') || 'Self',
                "Married": getVal(row, 'marriagestatus', 'Married', 'Marriage Status'),
                "Profession": getVal(row, 'profession', 'Profession'),
                "Designation": getVal(row, 'designation', 'Designation'),
                "Address": getVal(row, 'address', 'Address'),
                "Company": getVal(row, 'companyName', 'Company', 'Company Name'),
                "Company Address": getVal(row, 'companyAddress', 'Company Address', 'CompanyAddress'),
                "Mobile": mobile,
                "MobileVerified": mobileVerified === 'true' || mobileVerified === true || mobileVerified === 'TRUE',
                "Blood Group": getVal(row, 'bloodGroup', 'Blood Group', 'BloodGroup', 'bloodgroup'),
                "City": getVal(row, 'city', 'City'),
                "ParentId": getVal(row, 'parentId', 'ParentId', 'parent_id', 'parentId'),
                "LastUpdated": getVal(row, 'last_updated', 'LastUpdated', 'lastUpdated') || ''
            };
        });

        // 1. Group members by family: group by Member Id / memberId / ParentId / Id
        const familyMap = new Map();

        formattedRows.forEach(member => {
            const memId = (member['Member Id'] || member.memberId || '').toString().trim();
            const parentId = (member.ParentId || member.parentId || '').toString().trim();
            const rowId = (member.Id || member._id || '').toString().trim();

            // Grouping key: Member Id is preferred, fallback to ParentId, fallback to rowId
            const familyKey = memId || parentId || rowId;

            if (!familyMap.has(familyKey)) {
                familyMap.set(familyKey, []);
            }
            familyMap.get(familyKey).push(member);
        });

        const primaryList = [];

        familyMap.forEach((familyMembers) => {
            // Find the member whose Relation is 'Self' (case-insensitive)
            let selfMember = familyMembers.find(m => {
                const rel = (m.Relation || m.relation || '').toString().trim().toLowerCase();
                return rel === 'self';
            });

            // If no member in this family group has Relation === 'Self', pick the first member in the group
            if (!selfMember) {
                selfMember = familyMembers[0];
            }

            // All other members in this family group become dependents
            const dependents = familyMembers.filter(m => m !== selfMember);
            selfMember.dependents = dependents;

            primaryList.push(selfMember);
        });

        if (req.query.flat === 'true') {
            return res.json(req.query.paginate === 'false' ? formattedRows : { data: formattedRows, total: formattedRows.length });
        }

        // 2. Filtering
        const filter = (req.query.filter || req.query.search || '').trim().toLowerCase();
        let displayMembers = primaryList;

        if (filter) {
            displayMembers = primaryList.filter(parent => {
                const parentMatch = (
                    (parent.Name ? parent.Name.toLowerCase().includes(filter) : false) ||
                    (parent.Relation ? parent.Relation.toLowerCase().includes(filter) : false) ||
                    (parent.Mobile ? parent.Mobile.toLowerCase().includes(filter) : false) ||
                    (parent['Member Id'] ? parent['Member Id'].toLowerCase().includes(filter) : false) ||
                    (parent.City ? parent.City.toLowerCase().includes(filter) : false) ||
                    (parent.Profession ? parent.Profession.toLowerCase().includes(filter) : false)
                );
                if (parentMatch) return true;

                const depMatch = (parent.dependents || []).some(dep => (
                    (dep.Name ? dep.Name.toLowerCase().includes(filter) : false) ||
                    (dep.Relation ? dep.Relation.toLowerCase().includes(filter) : false) ||
                    (dep.Mobile ? dep.Mobile.toLowerCase().includes(filter) : false) ||
                    (dep['Member Id'] ? dep['Member Id'].toLowerCase().includes(filter) : false) ||
                    (dep.Profession ? dep.Profession.toLowerCase().includes(filter) : false)
                ));
                return depMatch;
            });
        }

        // 3. Sorting
        const sortColumn = req.query.sortColumn || req.query.sortBy || 'Member Id';
        const sortDirection = (req.query.sortDirection || req.query.sortOrder || 'asc').toLowerCase();

        displayMembers.sort((a, b) => {
            const res = compare(a[sortColumn], b[sortColumn]);
            return sortDirection === 'asc' ? res : -res;
        });

        if (req.query.paginate === 'false') {
            return res.json(displayMembers);
        }

        // 4. Server-Side Pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.max(1, parseInt(req.query.pageSize || req.query.limit) || 25);
        const total = displayMembers.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const pagedData = displayMembers.slice(startIndex, startIndex + pageSize);

        res.json({
            data: pagedData,
            total,
            page,
            pageSize,
            totalPages
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET: api/MemberData/:id
exports.getMemberById = async (req, res) => {
    try {
        const id = req.params.id;
        const [memberRows, shubhechhakRows] = await Promise.all([
            googleSheets.getRows(SHEETS.MEMBERS),
            googleSheets.getRows(SHEETS.SHUBHECHHAK)
        ]);

        let member = memberRows.find(r => {
            const rowId = getVal(r, '_id', 'Id', 'id', 'ID');
            const rowMemId = getVal(r, 'memberId', 'Member Id', 'MemberId');
            return String(rowId) === String(id) || String(rowMemId) === String(id);
        });
        let isShubhechhak = false;
        
        if (!member) {
            member = shubhechhakRows.find(r => {
                const rowId = getVal(r, '_id', 'Id', 'id', 'ID');
                const rowMemId = getVal(r, 'memberId', 'Member Id', 'MemberId');
                return String(rowId) === String(id) || String(rowMemId) === String(id);
            });
            isShubhechhak = true;
        }
        
        if (!member) return res.status(404).json({ message: "Not found" });

        // Lead calculation (Self member with same memberId)
        let leadName = '';
        if (!isShubhechhak) {
            const memFamilyId = getVal(member, 'memberId', 'Member Id', 'MemberId');
            const leadMember = memberRows.find(r => {
                const rMemId = getVal(r, 'memberId', 'Member Id', 'MemberId');
                const rRel = getVal(r, 'relation', 'Relation');
                return String(rMemId) === String(memFamilyId) && (rRel === 'Self' || rRel === 'self');
            });
            leadName = leadMember ? getVal(leadMember, 'name', 'Name') : '';
        }

        const memId = getVal(member, '_id', 'Id', 'id', 'ID') || id;
        const familyMemId = getVal(member, 'memberId', 'Member Id', 'MemberId') || memId;
        const name = getVal(member, 'name', 'Name');
        const address = getVal(member, 'address', 'Address');
        const dob = getVal(member, 'dateOfBirth', 'Date Of Birth', 'dob', 'Birth Date');
        const relation = getVal(member, 'relation', 'Relation');
        const bloodGroup = getVal(member, 'bloodGroup', 'Blood Group');
        const city = getVal(member, 'city', 'City');
        const married = getVal(member, 'marriagestatus', 'Married', 'Marriage Status');
        const profession = getVal(member, 'profession', 'Profession');
        const designation = getVal(member, 'designation', 'Designation');
        const company = getVal(member, 'companyName', 'Company', 'Company Name');
        const companyAddress = getVal(member, 'companyAddress', 'Company Address');
        const mobile = getVal(member, 'mobile', 'Mobile');
        const mobileVerified = getVal(member, 'mobile_verified', 'MobileVerified');
        const gender = getVal(member, 'gender', 'Gender');
        const parentId = getVal(member, 'parentId', 'ParentId');
        const lastUpdated = getVal(member, 'last_updated', 'LastUpdated');

        const result = {
            "Lead": leadName || name,
            "Address": address || '',
            "Id": memId,
            "Member Id": familyMemId,
            "Name": name || '',
            "Date Of Birth": dob || '',
            "Birth Date": dob || '',
            "Relation": relation || 'Self',
            "Blood Group": bloodGroup || '',
            "City": city || '',
            "Married": married || '',
            "Profession": profession || '',
            "Designation": designation || '',
            "Company": company || '',
            "Company Address": companyAddress || '',
            "Mobile": mobile || '',
            "MobileVerified": mobileVerified === 'true' || mobileVerified === true || mobileVerified === 'TRUE',
            "Gender": gender || '',
            "ParentId": parentId || '',
            "LastUpdated": lastUpdated || ''
        };
        res.json({ "Table": [result] });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET: api/MemberData/fetchByMemberId/:memberId
exports.getMemberByMemberId = async (req, res) => {
    try {
        const rawParam = (req.params.memberId || '').trim();
        if (!rawParam) return res.status(400).json({ message: "Member ID required" });
        const searchId = rawParam.toLowerCase();

        const [membersRows, shubRows] = await Promise.all([
            googleSheets.getRows(SHEETS.MEMBERS),
            googleSheets.getRows(SHEETS.SHUBHECHHAK).catch(() => [])
        ]);

        const matchesId = (row) => {
            const rowId = String(getVal(row, 'memberId', 'Member Id', 'MemberId', 'Member_Id', '_id', 'Id', 'id', 'ID') || '').trim().toLowerCase();
            if (!rowId) return false;
            if (rowId === searchId) return true;
            // Numeric comparison if both are digits (e.g. 012 vs 12)
            if (!isNaN(searchId) && !isNaN(rowId) && parseInt(searchId, 10) === parseInt(rowId, 10)) return true;
            return false;
        };

        // First check in members, prioritizing relation === 'Self'
        let member = membersRows.find(r => matchesId(r) && String(getVal(r, 'relation', 'Relation') || '').trim().toLowerCase() === 'self');
        if (!member) {
            member = membersRows.find(r => matchesId(r));
        }

        // If not found in members, search shubhechhak
        if (!member && Array.isArray(shubRows)) {
            member = shubRows.find(r => matchesId(r));
        }

        if (!member) return res.status(404).json({ message: `Member #${rawParam} not found` });

        const resolvedName = getVal(member, 'name', 'Name');
        const resolvedCity = getVal(member, 'city', 'City') || 'Vadodara';
        const resolvedMobile = getVal(member, 'mobile', 'Mobile', 'phone', 'Phone');
        const resolvedMemId = getVal(member, 'memberId', 'Member Id', 'MemberId', '_id', 'Id') || rawParam;

        res.json({
            "Name": resolvedName,
            "name": resolvedName,
            "City": resolvedCity,
            "city": resolvedCity,
            "Mobile": resolvedMobile,
            "mobile": resolvedMobile,
            "Member Id": resolvedMemId,
            "memberId": resolvedMemId
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// GET: api/MemberData/shubhechhak
exports.getShubhechhakMembers = async (req, res) => {
    try {
        const [configRows, rows] = await Promise.all([
            googleSheets.getRows(SHEETS.CONFIG),
            googleSheets.getRows(SHEETS.SHUBHECHHAK)
        ]);
        const activeItem = configRows.find(c => (c.key || c.Key || '').toLowerCase() === 'active');
        const isActive = activeItem ? (activeItem.value || activeItem.Value || '').toLowerCase() !== 'false' : true;
        if (!isActive) {
            return res.json(req.query.paginate === 'false' ? [] : { data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 });
        }

        let formattedRows = rows.map(row => {
            const id = getVal(row, '_id', 'Id', 'id', 'ID');
            const memberId = getVal(row, 'memberId', 'Member Id', 'MemberId', 'Member_Id', 'member_id');
            const mobile = getVal(row, 'mobile', 'Mobile', 'phone', 'Phone');
            const mobileVerified = getVal(row, 'mobile_verified', 'MobileVerified', 'mobileVerified');
            return {
                "_id": id,
                "memberId": memberId,
                "name": getVal(row, 'name', 'Name'),
                "gender": getVal(row, 'gender', 'Gender'),
                "dateOfBirth": getVal(row, 'dateOfBirth', 'Date Of Birth', 'DateOfBirth', 'dob', 'DOB'),
                "dob": getVal(row, 'dob', 'DOB', 'Birth Date', 'BirthDate', 'dateOfBirth'),
                "relation": getVal(row, 'relation', 'Relation') || 'Self',
                "marriagestatus": getVal(row, 'marriagestatus', 'Married', 'Marriage Status'),
                "profession": getVal(row, 'profession', 'Profession'),
                "designation": getVal(row, 'designation', 'Designation'),
                "address": getVal(row, 'address', 'Address'),
                "companyName": getVal(row, 'companyName', 'Company', 'Company Name'),
                "companyAddress": getVal(row, 'companyAddress', 'Company Address', 'CompanyAddress'),
                "mobile": mobile,
                "mobile_verified": mobileVerified === 'true' || mobileVerified === true || mobileVerified === 'TRUE',
                "bloodGroup": getVal(row, 'bloodGroup', 'Blood Group', 'BloodGroup', 'bloodgroup'),
                "city": getVal(row, 'city', 'City'),
                "parentId": getVal(row, 'parentId', 'ParentId', 'parent_id', 'parentId'),
                "Id": id,
                "Member Id": memberId,
                "Name": getVal(row, 'name', 'Name'),
                "Mobile": mobile,
                "Blood Group": getVal(row, 'bloodGroup', 'Blood Group', 'BloodGroup', 'bloodgroup'),
                "City": getVal(row, 'city', 'City')
            };
        });

        // 1. Filtering
        const filter = (req.query.filter || req.query.search || '').trim().toLowerCase();
        if (filter) {
            formattedRows = formattedRows.filter(member => (
                (member.Name ? member.Name.toLowerCase().includes(filter) : false) ||
                (member.Relation ? member.Relation.toLowerCase().includes(filter) : false) ||
                (member.Mobile ? member.Mobile.toLowerCase().includes(filter) : false) ||
                (member['Member Id'] ? member['Member Id'].toLowerCase().includes(filter) : false) ||
                (member.City ? member.City.toLowerCase().includes(filter) : false) ||
                (member.Profession ? member.Profession.toLowerCase().includes(filter) : false)
            ));
        }

        // 2. Sorting
        const sortColumn = req.query.sortColumn || req.query.sortBy || 'Member Id';
        const sortDirection = (req.query.sortDirection || req.query.sortOrder || 'asc').toLowerCase();

        const compare = (v1, v2) => {
            if (v1 == null) v1 = '';
            if (v2 == null) v2 = '';
            if (typeof v1 === 'string' && typeof v2 === 'string') {
                const numericV1 = parseFloat(v1);
                const numericV2 = parseFloat(v2);
                if (!isNaN(numericV1) && !isNaN(numericV2) && v1.match(/^\d+/) && v2.match(/^\d+/)) {
                    return numericV1 < numericV2 ? -1 : numericV1 > numericV2 ? 1 : 0;
                }
                return v1.localeCompare(v2, undefined, { numeric: true, sensitivity: 'base' });
            }
            return v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
        };

        formattedRows.sort((a, b) => {
            const res = compare(a[sortColumn], b[sortColumn]);
            return sortDirection === 'asc' ? res : -res;
        });

        // 3. Unpaginated check
        if (req.query.paginate === 'false') {
            return res.json(formattedRows);
        }

        // 4. Server-Side Pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.max(1, parseInt(req.query.pageSize || req.query.limit) || 25);
        const total = formattedRows.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const pagedData = formattedRows.slice(startIndex, startIndex + pageSize);

        res.json({
            data: pagedData,
            total,
            page,
            pageSize,
            totalPages
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Master Data Endpoints
exports.getBloodGroups = async (req, res) => {
    try {
        const rows = await googleSheets.getRows(SHEETS.BLOODGROUP);
        res.json(rows.length > 0 ? rows : []);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getRelations = async (req, res) => {
    try {
        const rows = await googleSheets.getRows(SHEETS.RELATION);
        res.json(rows.length > 0 ? rows : []);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getProfessions = async (req, res) => {
    try {
        const rows = await googleSheets.getRows(SHEETS.PROFESSION);
        res.json(rows.length > 0 ? rows : []);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getMarriageStatuses = async (req, res) => {
    try {
        const rows = await googleSheets.getRows(SHEETS.MARRIAGE_STATUS);
        res.json(rows.length > 0 ? rows : []);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getCities = async (req, res) => {
    try {
        const rows = await googleSheets.getRows(SHEETS.CITY);
        res.json(rows.length > 0 ? rows : []);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getShubhechhakCities = async (req, res) => {
    try {
        const rows = await googleSheets.getRows(SHEETS.CITY);
        res.json(rows.length > 0 ? rows : []);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// Donation Aggregation (By Year & Month)
exports.getTotalDonation = async (req, res) => {
    try {
        const rows = await googleSheets.getRows(SHEETS.DONATION);
        const aggregation = {};
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        const { filter, date: dateParam } = req.query;
        let filteredRows = [...rows];

        if (filter === 'today') {
            const today = dateParam ? new Date(dateParam) : new Date();
            filteredRows = rows.filter(row => {
                const date = new Date(row.paymentDate);
                return !isNaN(date.getTime()) &&
                    date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
            });
        }

        filteredRows.forEach(row => {
            const dateObj = new Date(row.paymentDate);
            if (isNaN(dateObj.getTime())) return;
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth();
            const dateStr = dateObj.getDate();
            
            // For 'today' filter, we want a daily summary. For normal, we want monthly.
            const key = (filter === 'today') 
                ? `${year}-${month}-${dateStr}` 
                : `${year}-${month.toString().padStart(2, '0')}`;
            
            const amount = parseFloat(row.amount) || 0;

            if (!aggregation[key]) {
                aggregation[key] = { 
                    year, 
                    month, 
                    day: dateStr,
                    monthName: monthNames[month],
                    avgDonation: 0, 
                    totalEntries: 0, 
                    totalDonation: 0,
                    ubsTotal: 0,
                    ubsTrustTotal: 0
                };
            }
            aggregation[key].totalEntries += 1;
            aggregation[key].totalDonation += amount;
            if (row.donationType === 'UBS') {
                aggregation[key].ubsTotal += amount;
            } else {
                aggregation[key].ubsTrustTotal += amount;
            }
        });

        const result = Object.values(aggregation)
            .map(item => ({
                ...item,
                avgDonation: item.totalDonation / item.totalEntries
            }))
            .sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });

        res.json(result);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// Donation List (Filtered by Year & Month, with Server-Side Pagination)
exports.getDonationData = async (req, res) => {
    try {
        const { year, month, filter, date: dateParam, donationType, search, sortColumn, sortDirection, paginate } = req.query;
        let rows = await googleSheets.getRows(SHEETS.DONATION);

        if (filter === 'today') {
            const today = dateParam ? new Date(dateParam) : new Date();
            rows = rows.filter(row => {
                const date = new Date(row.paymentDate);
                return !isNaN(date.getTime()) &&
                    date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
            });
        } else if (year) {
            rows = rows.filter(row => {
                const date = new Date(row.paymentDate);
                if (isNaN(date.getTime())) return false;
                
                const matchesYear = date.getFullYear().toString() === year;
                if (!matchesYear) return false;
                
                if (month !== undefined && month !== null && month !== '') {
                    return date.getMonth().toString() === month;
                }
                return true;
            });
        }

        if (donationType) {
            const searchType = donationType.toString().toLowerCase().trim();
            rows = rows.filter(row => {
                const type = (row.donationType || row.DonationType || 'UBS').toString().toLowerCase().trim();
                return type === searchType;
            });
        }

        const searchTerm = (search || filter && filter !== 'today' && filter !== 'all' ? filter : '').toString().trim().toLowerCase();
        if (searchTerm) {
            rows = rows.filter(row => {
                return (
                    (row.name && row.name.toLowerCase().includes(searchTerm)) ||
                    (row.memberId && row.memberId.toString().toLowerCase().includes(searchTerm)) ||
                    (row.city && row.city.toLowerCase().includes(searchTerm)) ||
                    (row.mobile && row.mobile.toLowerCase().includes(searchTerm))
                );
            });
        }

        let formattedRows = rows.map(row => ({
            id: row.id,
            "Member Id": row.memberId,
            "Name": row.name,
            "City": row.city,
            "Mobile": row.mobile,
            "MobileVerified": row.mobile_verified === 'true' || row.mobile_verified === true || row.mobile_verified === 'TRUE',
            "Amount": parseFloat(row.amount) || 0,
            "PaymentType": row.paymentType,
            "DonationType": (row.donationType || row.DonationType || "UBS").toString().trim(),
            "PaymentNo": row.paymentNo,
            "PaymentDate": row.paymentDate
        }));

        // Sorting
        const col = sortColumn || 'PaymentDate';
        const dir = (sortDirection || 'desc').toLowerCase();

        const compare = (v1, v2) => {
            if (v1 == null) v1 = '';
            if (v2 == null) v2 = '';
            if (col === 'PaymentDate') {
                return new Date(v1) - new Date(v2);
            }
            if (typeof v1 === 'string' && typeof v2 === 'string') {
                const numericV1 = parseFloat(v1);
                const numericV2 = parseFloat(v2);
                if (!isNaN(numericV1) && !isNaN(numericV2) && v1.match(/^\d+/) && v2.match(/^\d+/)) {
                    return numericV1 < numericV2 ? -1 : numericV1 > numericV2 ? 1 : 0;
                }
                return v1.localeCompare(v2, undefined, { numeric: true, sensitivity: 'base' });
            }
            return v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
        };

        formattedRows.sort((a, b) => {
            const res = compare(a[col], b[col]);
            return dir === 'asc' ? res : -res;
        });

        if (paginate === 'false') {
            return res.json(formattedRows);
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.max(1, parseInt(req.query.pageSize || req.query.limit) || 25);
        const total = formattedRows.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const pagedData = formattedRows.slice(startIndex, startIndex + pageSize);

        res.json({
            data: pagedData,
            total,
            page,
            pageSize,
            totalPages
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET: api/memberdata/appPin
exports.getAppPin = async (req, res) => {
    try {
        const configRows = await googleSheets.getRows(SHEETS.CONFIG);
        
        // Fetch specific pins for each role
        let adminPin = configRows.find(c => c.key === 'adminPin')?.value;
        let viewMembersPin = configRows.find(c => c.key === 'viewMembersPin')?.value;
        let donationInvoicePin = configRows.find(c => c.key === 'donationInvoicePin')?.value;
        let viewOnlyPin = configRows.find(c => c.key === 'viewOnlyPin')?.value;
        const legacyPin = configRows.find(c => c.key === 'appPin')?.value;

        // Proactively create missing pins in googlesheet if they don't exist
        if (!adminPin) {
            adminPin = legacyPin || '2026';
            await googleSheets.addRow(SHEETS.CONFIG, { key: 'adminPin', value: adminPin });
        }
        if (!viewMembersPin) {
            viewMembersPin = '1111';
            await googleSheets.addRow(SHEETS.CONFIG, { key: 'viewMembersPin', value: viewMembersPin });
        }
        if (!donationInvoicePin) {
            donationInvoicePin = '2222';
            await googleSheets.addRow(SHEETS.CONFIG, { key: 'donationInvoicePin', value: donationInvoicePin });
        }
        if (!viewOnlyPin) {
            viewOnlyPin = '3333';
            await googleSheets.addRow(SHEETS.CONFIG, { key: 'viewOnlyPin', value: viewOnlyPin });
        }

        res.json({ 
            admin: adminPin,
            viewMembers: viewMembersPin,
            donationInvoice: donationInvoicePin,
            viewOnly: viewOnlyPin,
            pin: legacyPin || adminPin // Backward compatibility
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Download Donation Data (Excel)
exports.downloadDonationData = async (req, res) => {
    try {
        const rows = await googleSheets.getRows(SHEETS.DONATION);
        const data = rows.map(row => ({
            receiptNo: row.id,
            memberId: row.memberId,
            name: row.name,
            city: row.city,
            mobile: row.mobile,
            amount: row.amount,
            paymentType: row.paymentType,
            donationType: row.donationType,
            paymentNo: row.paymentNo,
            paymentDate: row.paymentDate
        }));

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Donations');

        if (data.length > 0) {
            worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key: key }));
            worksheet.addRows(data);

            // Add Summary Rows
            worksheet.addRow([]);
            const ubsTotal = data.filter(r => r.donationType === 'UBS').reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
            const ubsTrustTotal = data.filter(r => r.donationType !== 'UBS').reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
            
            const ubsRow = worksheet.addRow({ amount: 'UBS Total:', paymentType: ubsTotal.toLocaleString() });
            const trustRow = worksheet.addRow({ amount: 'UBS Trust Total:', paymentType: ubsTrustTotal.toLocaleString() });
            const grandRow = worksheet.addRow({ amount: 'Grand Total:', paymentType: (ubsTotal + ubsTrustTotal).toLocaleString() });

            const genRow = worksheet.addRow({ amount: 'Generated on:', paymentType: new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) });
            
            // Apply styling
            [ubsRow, trustRow, grandRow, genRow].forEach(row => {
                row.getCell('amount').font = { bold: true };
                row.getCell('paymentType').font = { bold: true };
            });
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=donation_data.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// Download Donation Data (PDF)
exports.downloadDonationPDF = async (req, res) => {
    try {
        const rows = await googleSheets.getRows(SHEETS.DONATION);
        const sortedRows = rows.sort((a, b) => {
            const dateA = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
            const dateB = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        });

        let rowsHtml = sortedRows.map(row => `
            <tr>
                <td>${row.id || '-'}</td>
                <td>${row.memberId || '-'}</td>
                <td>${row.name || '-'}</td>
                <td>${row.city || '-'}</td>
                <td>${row.amount || '0'}</td>
                <td>${row.donationType || '-'}</td>
                <td>${row.paymentType || '-'}</td>
                <td>${row.paymentDate || '-'}</td>
            </tr>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    h2 { text-align: center; color: #4f46e5; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; }
                    th { background-color: #f8fafc; color: #64748b; font-weight: bold; }
                    tr:nth-child(even) { background-color: #fbfcfe; }
                </style>
            </head>
            <body>
                <h2>UBS - Donation History</h2>
                <p style="font-size: 10px; color: #94a3b8; text-align: right;">Generated on: ${new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Recp. No</th>
                            <th>Memb. ID</th>
                            <th>Donor Name</th>
                            <th>City</th>
                            <th>Amount</th>
                            <th>Donation Type</th>
                            <th>Payment</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div style="margin-top: 30px; page-break-inside: avoid; width: 350px;">
                    <h3 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-size: 16px;">Fund Segregation Summary</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <tr>
                            <th style="padding: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; text-align: left;">UBS Total</th>
                            <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0; text-align: right;">₹ ${sortedRows.filter(r => r.donationType === 'UBS').reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <th style="padding: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; text-align: left;">UBS Trust Total</th>
                            <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0; text-align: right;">₹ ${sortedRows.filter(r => r.donationType !== 'UBS').reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toLocaleString()}</td>
                        </tr>
                        <tr style="background-color: #f1f5f9;">
                            <th style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 800; text-align: left;">Grand Total</th>
                            <td style="padding: 10px; font-weight: 800; color: #4f46e5; font-size: 14px; text-align: right; border: 1px solid #e2e8f0;">₹ ${sortedRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toLocaleString()}</td>
                        </tr>
                    </table>
                </div>
            </body>
            </html>
        `;

        const browser = await getBrowser();
        if (!browser) {
            return res.set('Content-Type', 'text/html').send(htmlContent);
        }
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
            printBackground: true
        });
        await page.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="donation_report.pdf"',
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// Download Member Data (PDF)
exports.downloadMemberPDF = async (req, res) => {
    try {
        const rows = await googleSheets.getRows(SHEETS.MEMBERS);
        const sortedRows = rows.sort((a, b) => (parseInt(a.memberId) || 0) - (parseInt(b.memberId) || 0));

        let rowsHtml = sortedRows.map(row => `
            <tr>
                <td>${row.memberId || '-'}</td>
                <td>${row.name || '-'}</td>
                <td>${row.relation || '-'}</td>
                <td>${row.city || '-'}</td>
                <td>${row.mobile || '-'}</td>
                <td>${row.gender || '-'}</td>
                <td>${row.marriagestatus || '-'}</td>
            </tr>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    h2 { text-align: center; color: #1e293b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 11px; }
                    th { background-color: #f8fafc; color: #64748b; font-weight: bold; }
                    tr:nth-child(even) { background-color: #fbfcfe; }
                </style>
            </head>
            <body>
                <h2>UBS Seva Trust - Members Directory</h2>
                <p style="font-size: 10px; color: #94a3b8; text-align: right;">Generated on: ${new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Memb. ID</th>
                            <th>Name</th>
                            <th>Relation</th>
                            <th>City</th>
                            <th>Mobile</th>
                            <th>Gender</th>
                            <th>Married</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const browser = await getBrowser();
        if (!browser) {
            return res.set('Content-Type', 'text/html').send(htmlContent);
        }
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
            printBackground: true
        });
        await page.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="members_directory.pdf"',
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// Download Shubhechhak Data (PDF)
exports.downloadShubhechhakPDF = async (req, res) => {
    try {
        const rows = await googleSheets.getRows(SHEETS.SHUBHECHHAK);
        const sortedRows = rows.sort((a, b) => (parseInt(a.memberId) || 0) - (parseInt(b.memberId) || 0));

        let rowsHtml = sortedRows.map(row => `
            <tr>
                <td>${row.memberId || '-'}</td>
                <td>${row.name || '-'}</td>
                <td>${row.relation || '-'}</td>
                <td>${row.city || '-'}</td>
                <td>${row.mobile || '-'}</td>
                <td>${row.gender || '-'}</td>
                <td>${row.marriagestatus || '-'}</td>
            </tr>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    h2 { text-align: center; color: #1e293b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 11px; }
                    th { background-color: #f8fafc; color: #64748b; font-weight: bold; }
                    tr:nth-child(even) { background-color: #fbfcfe; }
                </style>
            </head>
            <body>
                <h2>UBS Seva Trust - Shubhechhak Directory</h2>
                <p style="font-size: 10px; color: #94a3b8; text-align: right;">Generated on: ${new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Memb. ID</th>
                            <th>Name</th>
                            <th>Relation</th>
                            <th>City</th>
                            <th>Mobile</th>
                            <th>Gender</th>
                            <th>Married</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const browser = await getBrowser();
        if (!browser) {
            return res.set('Content-Type', 'text/html').send(htmlContent);
        }
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
            printBackground: true
        });
        await page.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="shubhechhak_directory.pdf"',
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// POST: api/MemberData (Add Member)
exports.addMember = async (req, res) => {
    try {
        const value = req.body;
        const rows = await googleSheets.getRows(SHEETS.MEMBERS);
        
        const memberId = value.MemberId || value['Member Id'] || value.memberId;
        let newMemberId = memberId;
        let isNew = false;

        if (!newMemberId) {
            const maxId = rows.reduce((max, row) => Math.max(max, parseInt(row.memberId) || 0), 0);
            newMemberId = maxId + 1;
            isNew = true;
        }

        // Ensure headers exist
        const requiredKeys = ['_id', 'memberId', 'name', 'gender', 'relation', 'dob', 'dateOfBirth', 'marriagestatus', 'profession', 'designation', 'address', 'companyName', 'companyAddress', 'mobile', 'mobile_verified', 'bloodGroup', 'city', 'last_updated'];
        await googleSheets.ensureHeaders(SHEETS.MEMBERS, requiredKeys);

        const dob = formatDate(value.DateOfBirth || value.dob || value['Date Of Birth']);
        const _id = value.Id || value.id || Date.now().toString();

        const newRow = {
            _id: _id,
            memberId: newMemberId.toString(),
            name: value.Name || value.name,
            relation: value.Relation || value.relation,
            dob: dob,
            dateOfBirth: dob,
            marriagestatus: value.Married || value.MarriageStatus || value.marriageStatus,
            profession: value.Profession || value.profession,
            designation: value.Designation || value.designation,
            address: value.Address || value.address,
            companyName: value.Company || value.CompanyName || value.companyName || value.company,
            companyAddress: value.CompanyAddress || value.companyAddress || value['Company Address'],
            mobile: value.Mobile || value.mobile,
            mobile_verified: (value.MobileVerified || value.mobile_verified || "false").toString(),
            bloodGroup: value.BloodGroup || value['Blood Group'] || value.bloodGroup,
            gender: value.Gender || value.gender,
            city: value.City || value.city,
            last_updated: new Date().toISOString()
        };

        await googleSheets.addRow(SHEETS.MEMBERS, newRow);

        // Update Master Data Sheets
        await Promise.all([
            ensureMasterValue(SHEETS.RELATION, 'relation', newRow.relation),
            ensureMasterValue(SHEETS.MARRIAGE_STATUS, 'marriageStatus', newRow.marriagestatus),
            ensureMasterValue(SHEETS.PROFESSION, 'profession', newRow.profession),
            ensureMasterValue(SHEETS.BLOODGROUP, 'bloodGroup', newRow.bloodGroup),
            ensureMasterValue(SHEETS.CITY, 'city', newRow.city)
        ]);

        // Sync to Google Contacts (Ajivan member)
        try {
            await googleContacts.syncMember(newRow, 'Ajivan');
        } catch (syncError) {
            console.error('Failed to sync to Google Contacts:', syncError.message);
        }

        res.json({ message: isNew ? `Record added successfully! Your New member id is ${newMemberId}` : "Record added successfully!" });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST: api/MemberData/shubhechhak (Add Shubhechhak)
exports.addShubhechhakMember = async (req, res) => {
    try {
        const value = req.body;
        const rows = await googleSheets.getRows(SHEETS.SHUBHECHHAK);
        
        const memberId = value.MemberId || value['Member Id'] || value.memberId;
        let newMemberId = memberId;
        let isNew = false;

        if (!newMemberId) {
            const maxId = rows.reduce((max, row) => Math.max(max, parseInt(row.memberId) || 0), 0);
            newMemberId = maxId + 1;
            isNew = true;
        }

        // Ensure headers exist
        const requiredKeys = ['_id', 'memberId', 'name', 'gender', 'relation', 'dob', 'dateOfBirth', 'marriagestatus', 'profession', 'designation', 'address', 'companyName', 'companyAddress', 'mobile', 'mobile_verified', 'bloodGroup', 'city', 'last_updated'];
        await googleSheets.ensureHeaders(SHEETS.SHUBHECHHAK, requiredKeys);

        const dob = formatDate(value.DateOfBirth || value.dob || value['Date Of Birth']);
        const _id = value.Id || value.id || Date.now().toString();

        const newRow = {
            _id: _id,
            memberId: newMemberId.toString(),
            name: value.Name || value.name,
            relation: value.Relation || value.relation,
            dob: dob,
            dateOfBirth: dob,
            marriagestatus: value.Married || value.MarriageStatus || value.marriageStatus,
            profession: value.Profession || value.profession,
            designation: value.Designation || value.designation,
            address: value.Address || value.address,
            companyName: value.Company || value.CompanyName || value.companyName || value.company,
            companyAddress: value.CompanyAddress || value.companyAddress || value['Company Address'],
            mobile: value.Mobile || value.mobile,
            mobile_verified: (value.MobileVerified || value.mobile_verified || "false").toString(),
            bloodGroup: value.BloodGroup || value['Blood Group'] || value.bloodGroup,
            gender: value.Gender || value.gender,
            city: value.City || value.city,
            last_updated: new Date().toISOString()
        };

        await googleSheets.addRow(SHEETS.SHUBHECHHAK, newRow);
        
        // Update Master Data Sheets 
        await Promise.all([
            ensureMasterValue(SHEETS.RELATION, 'relation', newRow.relation),
            ensureMasterValue(SHEETS.MARRIAGE_STATUS, 'marriageStatus', newRow.marriagestatus),
            ensureMasterValue(SHEETS.PROFESSION, 'profession', newRow.profession),
            ensureMasterValue(SHEETS.BLOODGROUP, 'bloodGroup', newRow.bloodGroup),
            ensureMasterValue(SHEETS.CITY, 'city', newRow.city)
        ]);

        // Sync to Google Contacts (Shubhechhak member)
        try {
            await googleContacts.syncMember(newRow, 'Shubhechhak');
        } catch (syncError) {
            console.error('Failed to sync to Google Contacts:', syncError.message);
        }

        res.json({ message: isNew ? `Record added successfully! Your New member id is ${newMemberId}` : "Record added successfully!" });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT: api/MemberData/:id (Update Member)
exports.updateMember = async (req, res) => {
    try {
        const value = req.body;
        const id = req.params.id || value.Id || value.id || value._id; 

        const rows = await googleSheets.getRows(SHEETS.MEMBERS);
        const oldMember = rows.find(r => {
            const rowId = getVal(r, '_id', 'Id', 'id', 'ID');
            const rowMemId = getVal(r, 'memberId', 'Member Id', 'MemberId');
            return String(rowId) === String(id) || String(rowMemId) === String(id);
        });
        if (!oldMember) return res.status(404).json({ message: "Member not found" });

        const oldMemberId = getVal(oldMember, 'memberId', 'Member Id', 'MemberId');
        const newMemberIdRaw = value.MemberId || value['Member Id'] || value.memberId;
        const newMemberId = (newMemberIdRaw !== undefined && newMemberIdRaw !== null && newMemberIdRaw !== '') ? newMemberIdRaw.toString() : oldMemberId;
        const actualId = getVal(oldMember, '_id', 'Id', 'id', 'ID') || id;

        // Uniqueness check for family ID
        if (newMemberId !== oldMemberId) {
            const familyExists = rows.find(r => {
                const rMemId = getVal(r, 'memberId', 'Member Id', 'MemberId');
                const rRel = getVal(r, 'relation', 'Relation');
                const rId = getVal(r, '_id', 'Id', 'id', 'ID');
                return String(rMemId) === String(newMemberId) && rRel === 'Self' && String(rId) !== String(actualId);
            });
            if (familyExists) {
                const fName = getVal(familyExists, 'name', 'Name');
                return res.status(400).json({ message: `Member ID ${newMemberId} is already assigned to another family (${fName})` });
            }
        }

        // Ensure headers exist
        const requiredKeys = ['_id', 'memberId', 'name', 'gender', 'relation', 'dob', 'dateOfBirth', 'marriagestatus', 'profession', 'designation', 'address', 'companyName', 'companyAddress', 'mobile', 'mobile_verified', 'bloodGroup', 'city', 'last_updated'];
        await googleSheets.ensureHeaders(SHEETS.MEMBERS, requiredKeys);

        const oldDob = getVal(oldMember, 'dob', 'dateOfBirth', 'Date Of Birth');
        const oldName = getVal(oldMember, 'name', 'Name');
        const oldRelation = getVal(oldMember, 'relation', 'Relation');
        const oldMarriagestatus = getVal(oldMember, 'marriagestatus', 'Married', 'Marriage Status');
        const oldProfession = getVal(oldMember, 'profession', 'Profession');
        const oldDesignation = getVal(oldMember, 'designation', 'Designation');
        const oldAddress = getVal(oldMember, 'address', 'Address');
        const oldCompany = getVal(oldMember, 'companyName', 'Company', 'Company Name');
        const oldCompanyAddress = getVal(oldMember, 'companyAddress', 'Company Address');
        const oldMobile = getVal(oldMember, 'mobile', 'Mobile');
        const oldMobileVerified = getVal(oldMember, 'mobile_verified', 'MobileVerified');
        const oldBloodGroup = getVal(oldMember, 'bloodGroup', 'Blood Group');
        const oldCity = getVal(oldMember, 'city', 'City');
        const oldGender = getVal(oldMember, 'gender', 'Gender');

        const dob = formatDate(value.DateOfBirth ?? value.dob ?? value['Date Of Birth']);
        const updatedData = {
            _id: actualId,
            memberId: newMemberId,
            name: value.Name ?? value.name ?? oldName,
            relation: value.Relation ?? value.relation ?? oldRelation,
            dob: dob ?? oldDob,
            dateOfBirth: dob ?? oldDob,
            marriagestatus: value.Married ?? value.MarriageStatus ?? value.marriageStatus ?? oldMarriagestatus,
            profession: value.Profession ?? value.profession ?? oldProfession,
            designation: value.Designation ?? value.designation ?? oldDesignation,
            address: value.Address ?? value.address ?? oldAddress,
            companyName: value.Company ?? value.CompanyName ?? value.companyName ?? value.company ?? oldCompany,
            companyAddress: value.CompanyAddress ?? value.companyAddress ?? value['Company Address'] ?? oldCompanyAddress,
            mobile: value.Mobile ?? value.mobile ?? oldMobile,
            mobile_verified: (value.MobileVerified ?? value.mobile_verified ?? oldMobileVerified ?? "false").toString(),
            bloodGroup: value.BloodGroup ?? value['Blood Group'] ?? value.bloodGroup ?? oldBloodGroup,
            city: value.City ?? value.city ?? oldCity,
            gender: value.Gender ?? value.gender ?? oldGender,
            last_updated: new Date().toISOString()
        };

        let idCol = '_id';
        if (rows.length > 0) {
            if (rows[0]['_id'] !== undefined) idCol = '_id';
            else if (rows[0]['Id'] !== undefined) idCol = 'Id';
            else if (rows[0]['id'] !== undefined) idCol = 'id';
        }

        await googleSheets.updateRow(SHEETS.MEMBERS, idCol, actualId, updatedData);

        // Update Master Data Sheets
        await Promise.all([
            ensureMasterValue(SHEETS.RELATION, 'relation', updatedData.relation),
            ensureMasterValue(SHEETS.MARRIAGE_STATUS, 'marriageStatus', updatedData.marriagestatus),
            ensureMasterValue(SHEETS.PROFESSION, 'profession', updatedData.profession),
            ensureMasterValue(SHEETS.BLOODGROUP, 'bloodGroup', updatedData.bloodGroup),
            ensureMasterValue(SHEETS.CITY, 'city', updatedData.city)
        ]);

        if (oldMemberId && newMemberId && oldMemberId !== newMemberId) {
            const memberUpdates = rows
                .filter(row => getVal(row, 'memberId', 'Member Id') === oldMemberId && getVal(row, '_id', 'Id', 'id') !== actualId)
                .map(row => {
                    const rId = getVal(row, '_id', 'Id', 'id');
                    return { idColumn: idCol, idValue: rId, data: { ...row, memberId: newMemberId } };
                });
            
            const donationRows = await googleSheets.getRows(SHEETS.DONATION);
            const donationUpdates = donationRows
                .filter(dRow => getVal(dRow, 'memberId', 'Member Id') === oldMemberId)
                .map(dRow => ({ idColumn: 'id', idValue: dRow.id, data: { ...dRow, memberId: newMemberId } }));

            await Promise.all([
                googleSheets.batchUpdateRows(SHEETS.MEMBERS, memberUpdates),
                googleSheets.batchUpdateRows(SHEETS.DONATION, donationUpdates)
            ]);
        }

        // Sync to Google Contacts (Ajivan member update)
        try {
            await googleContacts.syncMember(updatedData, 'Ajivan');
        } catch (syncError) {
            console.error('Failed to sync to Google Contacts:', syncError.message);
        }

        res.json({ message: "Record updated successfully!" });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT: api/MemberData/shubhechhak/:id
exports.updateShubhechhakMember = async (req, res) => {
    try {
        const value = req.body;
        const id = req.params.id || value.Id || value.id || value._id;

        const rows = await googleSheets.getRows(SHEETS.SHUBHECHHAK);
        const oldMember = rows.find(r => {
            const rowId = getVal(r, '_id', 'Id', 'id', 'ID');
            const rowMemId = getVal(r, 'memberId', 'Member Id', 'MemberId');
            return String(rowId) === String(id) || String(rowMemId) === String(id);
        });
        if (!oldMember) return res.status(404).json({ message: "Shubhechhak not found" });

        const oldMemberId = getVal(oldMember, 'memberId', 'Member Id', 'MemberId');
        const newMemberIdRaw = value.MemberId || value['Member Id'] || value.memberId;
        const newMemberId = (newMemberIdRaw !== undefined && newMemberIdRaw !== null && newMemberIdRaw !== '') ? newMemberIdRaw.toString() : oldMemberId;
        const actualId = getVal(oldMember, '_id', 'Id', 'id', 'ID') || id;

        // Uniqueness check for shubhechhak ID
        if (newMemberId !== oldMemberId) {
            const familyExists = rows.find(r => {
                const rMemId = getVal(r, 'memberId', 'Member Id', 'MemberId');
                const rId = getVal(r, '_id', 'Id', 'id', 'ID');
                return String(rMemId) === String(newMemberId) && String(rId) !== String(actualId);
            });
            if (familyExists) {
                const fName = getVal(familyExists, 'name', 'Name');
                return res.status(400).json({ message: `Shubhechhak ID ${newMemberId} is already assigned to ${fName}` });
            }
        }

        // Ensure headers exist
        const requiredKeys = ['_id', 'memberId', 'name', 'gender', 'relation', 'dob', 'dateOfBirth', 'marriagestatus', 'profession', 'designation', 'address', 'companyName', 'companyAddress', 'mobile', 'mobile_verified', 'bloodGroup', 'city', 'last_updated'];
        await googleSheets.ensureHeaders(SHEETS.SHUBHECHHAK, requiredKeys);

        const oldDob = getVal(oldMember, 'dob', 'dateOfBirth', 'Date Of Birth');
        const oldName = getVal(oldMember, 'name', 'Name');
        const oldRelation = getVal(oldMember, 'relation', 'Relation');
        const oldMarriagestatus = getVal(oldMember, 'marriagestatus', 'Married', 'Marriage Status');
        const oldProfession = getVal(oldMember, 'profession', 'Profession');
        const oldDesignation = getVal(oldMember, 'designation', 'Designation');
        const oldAddress = getVal(oldMember, 'address', 'Address');
        const oldCompany = getVal(oldMember, 'companyName', 'Company', 'Company Name');
        const oldCompanyAddress = getVal(oldMember, 'companyAddress', 'Company Address');
        const oldMobile = getVal(oldMember, 'mobile', 'Mobile');
        const oldMobileVerified = getVal(oldMember, 'mobile_verified', 'MobileVerified');
        const oldBloodGroup = getVal(oldMember, 'bloodGroup', 'Blood Group');
        const oldCity = getVal(oldMember, 'city', 'City');
        const oldGender = getVal(oldMember, 'gender', 'Gender');

        const dob = formatDate(value.DateOfBirth ?? value.dob ?? value['Date Of Birth']);
        const updatedData = {
            _id: actualId,
            memberId: newMemberId,
            name: value.Name ?? value.name ?? oldName,
            relation: value.Relation ?? value.relation ?? oldRelation,
            dob: dob ?? oldDob,
            dateOfBirth: dob ?? oldDob,
            marriagestatus: value.Married ?? value.MarriageStatus ?? value.marriageStatus ?? oldMarriagestatus,
            profession: value.Profession ?? value.profession ?? oldProfession,
            designation: value.Designation ?? value.designation ?? oldDesignation,
            address: value.Address ?? value.address ?? oldAddress,
            companyName: value.Company ?? value.CompanyName ?? value.companyName ?? value.company ?? oldCompany,
            companyAddress: value.CompanyAddress ?? value.companyAddress ?? value['Company Address'] ?? oldCompanyAddress,
            mobile: value.Mobile ?? value.mobile ?? oldMobile,
            mobile_verified: (value.MobileVerified ?? value.mobile_verified ?? oldMobileVerified ?? "false").toString(),
            bloodGroup: value.BloodGroup ?? value['Blood Group'] ?? value.bloodGroup ?? oldBloodGroup,
            city: value.City ?? value.city ?? oldCity,
            gender: value.Gender ?? value.gender ?? oldGender,
            last_updated: new Date().toISOString()
        };

        let idCol = '_id';
        if (rows.length > 0) {
            if (rows[0]['_id'] !== undefined) idCol = '_id';
            else if (rows[0]['Id'] !== undefined) idCol = 'Id';
            else if (rows[0]['id'] !== undefined) idCol = 'id';
        }

        await googleSheets.updateRow(SHEETS.SHUBHECHHAK, idCol, actualId, updatedData);

        // Update Master Data Sheets
        await Promise.all([
            ensureMasterValue(SHEETS.RELATION, 'relation', updatedData.relation),
            ensureMasterValue(SHEETS.MARRIAGE_STATUS, 'marriageStatus', updatedData.marriagestatus),
            ensureMasterValue(SHEETS.PROFESSION, 'profession', updatedData.profession),
            ensureMasterValue(SHEETS.BLOODGROUP, 'bloodGroup', updatedData.bloodGroup),
            ensureMasterValue(SHEETS.CITY, 'city', updatedData.city)
        ]);

        if (oldMemberId && newMemberId && oldMemberId !== newMemberId) {
            const shubhechhakUpdates = rows
                .filter(row => getVal(row, 'memberId', 'Member Id') === oldMemberId && getVal(row, '_id', 'Id', 'id') !== actualId)
                .map(row => {
                    const rId = getVal(row, '_id', 'Id', 'id');
                    return { idColumn: idCol, idValue: rId, data: { ...row, memberId: newMemberId } };
                });
            
            const donationRows = await googleSheets.getRows(SHEETS.DONATION);
            const donationUpdates = donationRows
                .filter(dRow => getVal(dRow, 'memberId', 'Member Id') === oldMemberId)
                .map(dRow => ({ idColumn: 'id', idValue: dRow.id, data: { ...dRow, memberId: newMemberId } }));

            await Promise.all([
                googleSheets.batchUpdateRows(SHEETS.SHUBHECHHAK, shubhechhakUpdates),
                googleSheets.batchUpdateRows(SHEETS.DONATION, donationUpdates)
            ]);
        }

        // Sync to Google Contacts (Shubhechhak member update)
        try {
            await googleContacts.syncMember(updatedData, 'Shubhechhak');
        } catch (syncError) {
            console.error('Failed to sync to Google Contacts:', syncError.message);
        }

        res.json({ message: "Record updated successfully!" });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE: api/MemberData/:id
exports.deleteMember = async (req, res) => {
    try {
        const id = req.params.id;
        const rows = await googleSheets.getRows(SHEETS.MEMBERS);
        const member = rows.find(r => {
            const rowId = getVal(r, '_id', 'Id', 'id', 'ID');
            const rowMemId = getVal(r, 'memberId', 'Member Id', 'MemberId');
            return String(rowId) === String(id) || String(rowMemId) === String(id);
        });

        let idCol = '_id';
        if (rows.length > 0) {
            if (rows[0]['_id'] !== undefined) idCol = '_id';
            else if (rows[0]['Id'] !== undefined) idCol = 'Id';
            else if (rows[0]['id'] !== undefined) idCol = 'id';
            else if (rows[0]['Member Id'] !== undefined) idCol = 'Member Id';
        }

        const actualId = member ? (getVal(member, '_id', 'Id', 'id', 'ID') || id) : id;
        await googleSheets.deleteRow(SHEETS.MEMBERS, idCol, actualId);

        if (member) {
            try {
                const memName = getVal(member, 'name', 'Name');
                const memId = getVal(member, 'memberId', 'Member Id', 'MemberId');
                await googleContacts.deleteContact(memId, memName, 'Ajivan');
            } catch (syncError) {
                console.error('Failed to delete Google Contact:', syncError.message);
            }
        }

        res.json({ message: "Record deleted successfully from Member list!" });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE: api/MemberData/shubhechhak/:id
exports.deleteShubhechhakMember = async (req, res) => {
    try {
        const id = req.params.id;
        const rows = await googleSheets.getRows(SHEETS.SHUBHECHHAK);
        const member = rows.find(r => {
            const rowId = getVal(r, '_id', 'Id', 'id', 'ID');
            const rowMemId = getVal(r, 'memberId', 'Member Id', 'MemberId');
            return String(rowId) === String(id) || String(rowMemId) === String(id);
        });

        let idCol = '_id';
        if (rows.length > 0) {
            if (rows[0]['_id'] !== undefined) idCol = '_id';
            else if (rows[0]['Id'] !== undefined) idCol = 'Id';
            else if (rows[0]['id'] !== undefined) idCol = 'id';
            else if (rows[0]['Member Id'] !== undefined) idCol = 'Member Id';
        }

        const actualId = member ? (getVal(member, '_id', 'Id', 'id', 'ID') || id) : id;
        await googleSheets.deleteRow(SHEETS.SHUBHECHHAK, idCol, actualId);

        if (member) {
            try {
                const memName = getVal(member, 'name', 'Name');
                const memId = getVal(member, 'memberId', 'Member Id', 'MemberId');
                await googleContacts.deleteContact(memId, memName, 'Shubhechhak');
            } catch (syncError) {
                console.error('Failed to delete Google Contact:', syncError.message);
            }
        }

        res.json({ message: "Record deleted successfully from Shubhechhak list!" });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE: api/MemberData/donation/:id
exports.deleteDonation = async (req, res) => {
    try {
        await googleSheets.deleteRow(SHEETS.DONATION, 'id', req.params.id);
        res.json({ message: "Donation record deleted successfully!" });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST: api/MemberData/donation
exports.createDonation = async (req, res) => {
    try {
        const value = req.body;
        const generateOnly = value.GenerateOnly !== undefined ? value.GenerateOnly : value.generateOnly;
        const saveOnly = value.SaveOnly !== undefined ? value.SaveOnly : value.saveOnly;
        let maxId = value.id || value.Id || "-"; // Use provided ID if available
        const paymentTypeStr = value.PaymentType || value.paymentType;
        const memberId = value.MemberId || value.memberId;
        const amount = value.Amount || value.amount;
        const name = value.Name || value.name;
        const mobile = value.Mobile || value.mobile;
        const paymentNo = value.PaymentNo || value.paymentNo;
        const city = value.City || value.city;
        const donationType = value.DonationType || value.donationType || "UBS";

        const [donationRows, templateContent] = await Promise.all([
            (generateOnly) ? Promise.resolve([]) : googleSheets.getRows(SHEETS.DONATION),
            (saveOnly) ? Promise.resolve('') : getInvoiceTemplateHtml()
        ]);
        
        let nextId = 0;
        if (!generateOnly) {
            // Ensure headers exist
            await googleSheets.ensureHeaders(SHEETS.DONATION, ['id', 'memberId', 'amount', 'name', 'mobile', 'paymentType', 'donationType', 'paymentNo', 'paymentDate', 'city']);

            nextId = donationRows.reduce((max, row) => Math.max(max, parseInt(row.id) || 0), 0) + 1;
            
            const paymentType = paymentTypeStr === "રોકડા" ? "cash" : (paymentTypeStr === "UPI" ? "upi" : (paymentTypeStr === "ચેક" ? "cheque" : null));
            const now = new Date().toISOString().slice(0, 10);

            const newDonation = {
                id: nextId.toString(),
                memberId: memberId ? memberId.toString() : '',
                amount: amount.toString(),
                name: name,
                mobile: mobile,
                paymentType: paymentType,
                paymentNo: paymentNo || '',
                paymentDate: now,
                city: city,
                donationType: donationType
            };

            await googleSheets.addRow(SHEETS.DONATION, newDonation);
            
            // Update Master Data Sheet
            await ensureMasterValue(SHEETS.CITY, 'city', city);

            maxId = nextId;

            if (saveOnly) {
                return res.json({ success: true, message: "Donation data saved successfully!", id: maxId });
            }
        }

        let htmlContent = templateContent;

        const nowFormatted = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

        htmlContent = htmlContent
            .replace("#name#", name || (memberId ? memberId.toString() : "-"))
            .replace("#paid-date#", nowFormatted)
            .replace("#city#", city || "-")
            .replace("#amount#", amount ? amount.toString() : "-")
            .replace("#memberId#", memberId || "-")
            .replace("#mobile#", mobile || "-")
            .replace("#paymentType#", paymentTypeStr === "રોકડા" ? paymentTypeStr : paymentTypeStr + " દ્વારા ")
            .replace("#paymentType-1#", !paymentTypeStr ? "-" : (paymentTypeStr === "રોકડા" ? "" : paymentTypeStr + " નંબર: "))
            .replace("#paymentNo#", !paymentNo ? (paymentTypeStr === "રોકડા" ? "" : "-") : paymentNo)
            .replace("#logo#", logoBase64)
            .replace("#trustName#", donationType === "UBS" ? "શ્રી ઉનેવાળ બ્રહ્મસમાજ, વડોદરા" : "શ્રી ઉનેવાળ બ્રહ્મસમાજ સેવા ટ્રસ્ટ, વડોદરા")
            .replace("#receiptNo#", maxId);

        const browser = await getBrowser();
        if (!browser) {
            return res.set('Content-Type', 'text/html').send(htmlContent);
        }
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        // Small delay to ensure Google Fonts are fully rendered
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.setViewport({ width: 800, height: 1000, deviceScaleFactor: 3 });
        
        const imageBuffer = await page.screenshot({
            type: 'jpeg',
            quality: 95,
            fullPage: true
        });
        await page.close();

        const safeName = (name || "receipt").replace(/[^a-zA-Z0-9]/g, '_');
        const encodedName = encodeURIComponent(name || "receipt");

        res.set({
            'Content-Type': 'image/jpeg',
            'Content-Disposition': `attachment; filename="${safeName}.jpg"; filename*=UTF-8''${encodedName}.jpg`,
            'Content-Length': imageBuffer.length
        });
        res.send(imageBuffer);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// GET: api/MemberData/ping (Used for heartbeat/cron)
exports.ping = (req, res) => {
    res.json({ 
        status: "active", 
        timestamp: new Date().toISOString(),
        message: "API is warm and ready!"
    });
};

// GET: api/MemberData/syncAll
exports.syncAllToContacts = async (req, res) => {
    try {
        const [members, shubhechhaks] = await Promise.all([
            googleSheets.getRows(SHEETS.MEMBERS),
            googleSheets.getRows(SHEETS.SHUBHECHHAK)
        ]);

        console.log(`Starting bulk sync: ${members.length} members, ${shubhechhaks.length} shubhechhaks`);

        let successCount = 0;
        let failCount = 0;

        // Sync regular members
        for (const member of members) {
            try {
                await googleContacts.syncMember(member, 'Ajivan');
                successCount++;
            } catch (e) {
                console.error(`Failed to sync member ${member.memberId}:`, e.message);
                failCount++;
            }
        }

        // Sync shubhechhaks
        for (const s of shubhechhaks) {
            try {
                await googleContacts.syncMember(s, 'Shubhechhak');
                successCount++;
            } catch (e) {
                console.error(`Failed to sync shubhechhak ${s.memberId}:`, e.message);
                failCount++;
            }
        }

        res.json({
            message: "Bulk synchronization completed",
            total: members.length + shubhechhaks.length,
            success: successCount,
            failed: failCount
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST: api/MemberData/whatsapp/broadcast
exports.sendWhatsAppBroadcast = async (req, res) => {
    try {
        const { message, customNumbers, targetType, includeSelf } = req.body;
        if (!message) {
            return res.status(400).json({ message: "Message content is required for WhatsApp broadcast" });
        }

        const recipients = [];
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        let apiResults = [];
        let selfMembers = [];

        const shouldIncludeSelf = includeSelf !== false && includeSelf !== 'false';

        if (shouldIncludeSelf && (!targetType || targetType === 'self' || targetType === 'both')) {
            const rows = await googleSheets.getRows(SHEETS.MEMBERS);
            selfMembers = rows.filter(r => {
                const rel = (r.relation || r.Relation || '').trim().toLowerCase();
                return rel === 'self' || rel.includes('self');
            });

            for (const m of selfMembers) {
                const name = m.name || m.Name || 'Member';
                let mobile = m.mobile || m.Mobile || '';
                mobile = mobile.replace(/\D/g, ''); // keep digits only
                if (mobile.length >= 10) {
                    const formattedMobile = mobile.length === 10 ? `91${mobile}` : mobile;
                    recipients.push({
                        name,
                        mobile: formattedMobile,
                        rawMobile: mobile,
                        memberId: m.memberId || m.Id || m._id
                    });
                }
            }
        }

        if (customNumbers) {
            const numList = Array.isArray(customNumbers) 
                ? customNumbers 
                : customNumbers.split(',').map(n => n.trim());

            for (let num of numList) {
                num = num.replace(/\D/g, '');
                if (num.length >= 10) {
                    const formattedMobile = num.length === 10 ? `91${num}` : num;
                    if (!recipients.some(r => r.mobile === formattedMobile)) {
                        recipients.push({
                            name: `Custom (${formattedMobile})`,
                            mobile: formattedMobile,
                            rawMobile: num,
                            memberId: 'custom'
                        });
                    }
                }
            }
        }

        if (accessToken && phoneNumberId) {
            for (const r of recipients) {
                try {
                    const apiRes = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            recipient_type: 'individual',
                            to: r.mobile,
                            type: 'text',
                            text: { body: message }
                        })
                    });
                    const apiJson = await apiRes.json();
                    apiResults.push({ mobile: r.mobile, success: apiRes.ok, response: apiJson });
                } catch (apiErr) {
                    apiResults.push({ mobile: r.mobile, success: false, error: apiErr.message });
                }
            }
        }

        res.json({
            success: true,
            message: `WhatsApp broadcast prepared for ${recipients.length} recipients`,
            totalSelfMembers: selfMembers.length,
            recipients,
            whatsappApiEnabled: !!(accessToken && phoneNumberId),
            apiResults
        });
    } catch (err) {
        console.error("WhatsApp broadcast error:", err);
        res.status(500).json({ message: err.message });
    }
};

// Relationship Mapping & Family Tree Controllers
exports.getRelationships = async (req, res) => {
    try {
        const rows = await googleSheets.getRows(SHEETS.RELATIONSHIP);
        res.json(rows || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.saveRelationship = async (req, res) => {
    try {
        const { memberId, relatedMemberId, relationshipType } = req.body;
        if (!memberId || !relatedMemberId || !relationshipType) {
            return res.status(400).json({ message: "memberId, relatedMemberId, and relationshipType are required" });
        }
        const relationshipId = 'rel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const newRel = {
            relationshipId,
            memberId,
            relatedMemberId,
            relationshipType,
            isActive: 'true',
            createdDate: new Date().toISOString()
        };
        await googleSheets.addRow(SHEETS.RELATIONSHIP, newRel);

        // Automatic 2-way sync
        let inverseType = '';
        const rType = relationshipType.toLowerCase();
        if (rType === 'spouse') inverseType = 'Spouse';
        else if (rType === 'father' || rType === 'mother') inverseType = 'Child';
        else if (rType === 'child') inverseType = 'Parent';

        if (inverseType) {
            const invRelId = 'rel_inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            await googleSheets.addRow(SHEETS.RELATIONSHIP, {
                relationshipId: invRelId,
                memberId: relatedMemberId,
                relatedMemberId: memberId,
                relationshipType: inverseType,
                isActive: 'true',
                createdDate: new Date().toISOString()
            });
        }

        res.json({ success: true, message: "Relationship mapped successfully", relationship: newRel });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteRelationship = async (req, res) => {
    try {
        const { id } = req.params;
        let rows = await googleSheets.getRows(SHEETS.RELATIONSHIP);
        const target = rows.find(r => r.relationshipId === id || r._id === id);
        if (!target) return res.status(404).json({ message: "Relationship not found" });

        const updated = rows.filter(r => r.relationshipId !== id && r._id !== id && !(r.memberId === target.relatedMemberId && r.relatedMemberId === target.memberId));
        googleSheets.cache[SHEETS.RELATIONSHIP] = { timestamp: Date.now(), data: updated };
        if (googleSheets.memoryStore && googleSheets.memoryStore[SHEETS.RELATIONSHIP]) {
            googleSheets.memoryStore[SHEETS.RELATIONSHIP] = updated;
        }

        res.json({ success: true, message: "Relationship removed successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getFamilyTree = async (req, res) => {
    try {
        const memberId = req.params.id;
        const [memberRows, relRows] = await Promise.all([
            googleSheets.getRows(SHEETS.MEMBERS),
            googleSheets.getRows(SHEETS.RELATIONSHIP)
        ]);
        const memberMap = new Map();
        memberRows.forEach(m => {
            const id = m.memberId || m["Member Id"] || m.Id || m._id;
            if (id) memberMap.set(String(id), m);
        });

        const root = memberMap.get(String(memberId)) || memberRows[0];
        if (!root) return res.status(404).json({ message: "Member not found" });

        const familyMemId = root.memberId || root["Member Id"] || root.Id || root._id;
        const familyMembers = memberRows.filter(m => String(m.memberId || m["Member Id"] || m.Id || m._id) === String(familyMemId) || String(m.parentId) === String(familyMemId));

        res.json({
            root,
            familyMembers,
            relationships: relRows.filter(r => r.memberId === String(familyMemId) || r.relatedMemberId === String(familyMemId))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// ENTRYPASS PORTAL & SCANNER CONTROLLER
// ==========================================

let entryPassesStore = [
    {
        passId: "EP-2026-0101",
        eventId: "EVT-01",
        eventName: "UBS Annual General Meeting & Sneh Milan 2026",
        memberId: "1",
        memberName: "Rameshbhai Patel",
        mobile: "9825012345",
        passType: "VIP Access",
        relation: "Self (Primary Member)",
        dependentsCount: 2,
        dependents: ["Savitaben Patel (Spouse)", "Jignesh Patel (Son)"],
        gate: "Gate 1 - Main Entry",
        status: "Checked In",
        foodCoupon: true,
        foodClaimed: true,
        issuedAt: new Date(Date.now() - 3600000).toISOString(),
        checkedInAt: new Date(Date.now() - 1800000).toISOString(),
        qrPayload: "EP:EP-2026-0101:MEM:1:VIP"
    },
    {
        passId: "EP-2026-0102",
        eventId: "EVT-01",
        eventName: "UBS Annual General Meeting & Sneh Milan 2026",
        memberId: "2",
        memberName: "Sureshchandra Shah",
        mobile: "9898011223",
        passType: "Standard Pass",
        relation: "Self (Primary Member)",
        dependentsCount: 1,
        dependents: ["Taraben Shah (Spouse)"],
        gate: "Gate 2 - Family Entry",
        status: "Issued",
        foodCoupon: true,
        foodClaimed: false,
        issuedAt: new Date(Date.now() - 7200000).toISOString(),
        checkedInAt: null,
        qrPayload: "EP:EP-2026-0102:MEM:2:STD"
    }
];

let entryEventsStore = [
    { id: "EVT-01", name: "UBS Annual General Meeting & Sneh Milan 2026", date: "2026-10-15", venue: "UBS Central Hall, Ahmedabad" },
    { id: "EVT-02", name: "UBS Yuva Cultural Mahotsav 2026", date: "2026-11-20", venue: "Gujarat University Convention Centre" },
    { id: "EVT-03", name: "UBS Blood Donation & Free Health Camp 2026", date: "2026-12-05", venue: "UBS Community Complex, Vadodara" }
];

exports.getEntryPasses = async (req, res) => {
    try {
        const { eventId, search, status } = req.query;
        let list = entryPassesStore.map(p => ({
            ...p,
            id: p.id || p.passId,
            passId: p.passId || p.id
        }));

        if (eventId && eventId !== 'all') {
            list = list.filter(p => p.eventId === eventId);
        }
        if (status && status !== 'all') {
            list = list.filter(p => p.status === status);
        }
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(p => 
                (p.passId && p.passId.toLowerCase().includes(q)) ||
                (p.memberName && p.memberName.toLowerCase().includes(q)) ||
                (p.memberId && String(p.memberId).toLowerCase().includes(q)) ||
                (p.mobile && p.mobile.includes(q))
            );
        }

        const totalPasses = list.length;
        const checkedIn = list.filter(p => p.status === "Checked In").length;
        const pending = totalPasses - checkedIn;
        const foodClaimed = list.filter(p => p.foodClaimed).length;

        res.json({ 
            success: true, 
            status: 'success', 
            data: list, 
            passes: list, 
            events: entryEventsStore,
            stats: { totalPasses, checkedIn, pending, foodClaimed }
        });
    } catch (err) {
        res.status(500).json({ success: false, status: 'error', message: err.message });
    }
};

exports.issueEntryPass = async (req, res) => {
    try {
        const { memberId, memberName, mobile, eventId, eventName, passType, dependents, gate, foodCoupon } = req.body;
        const passSeq = String(entryPassesStore.length + 101).padStart(4, '0');
        const passId = `EP-2026-${passSeq}`;
        const newPass = {
            id: passId,
            passId,
            eventId: eventId || "EVT-01",
            eventName: eventName || "UBS Annual General Meeting & Sneh Milan 2026",
            memberId: memberId || "0",
            memberName: memberName || "UBS Guest / Member",
            mobile: mobile || "",
            passType: passType || "Standard Pass",
            relation: "Self",
            dependentsCount: Array.isArray(dependents) ? dependents.length : 0,
            dependents: Array.isArray(dependents) ? dependents : [],
            gate: gate || "Gate 1 - Main Entry",
            status: "Issued",
            foodCoupon: foodCoupon !== false,
            foodClaimed: false,
            issuedAt: new Date().toISOString(),
            checkedInAt: null,
            qrPayload: `EP:${passId}:MEM:${memberId}:${passType}`
        };
        entryPassesStore.unshift(newPass);
        res.json({ success: true, status: 'success', message: "EntryPass issued successfully", pass: newPass, data: newPass });
    } catch (err) {
        res.status(500).json({ success: false, status: 'error', message: err.message });
    }
};

exports.scanEntryPass = async (req, res) => {
    try {
        const queryStr = req.body.query || req.body.qrPayload || req.body.passId || req.body.memberId;
        const action = req.body.action || 'scan';
        const gate = req.body.gate || 'Gate 1 - Main Entry';

        if (!queryStr) {
            return res.status(400).json({ success: false, status: 'error', message: "Query string required for scanning" });
        }
        const q = String(queryStr).trim().toLowerCase();
        let pass = entryPassesStore.find(p => 
            (p.passId && p.passId.toLowerCase() === q) || 
            (p.id && p.id.toLowerCase() === q) || 
            (p.qrPayload && p.qrPayload.toLowerCase() === q) || 
            (p.memberId && String(p.memberId).toLowerCase() === q) ||
            (p.mobile && p.mobile === q)
        );
        if (!pass) {
            return res.json({ 
                success: false, 
                status: 'error',
                code: "NOT_FOUND",
                message: "No valid EntryPass found for this QR Code, Pass ID or Member ID",
                searched: queryStr
            });
        }

        if (!pass.id) pass.id = pass.passId;
        if (!pass.passId) pass.passId = pass.id;

        if (action === 'claim_food') {
            if (!pass.foodCoupon) {
                return res.json({ success: false, status: 'error', code: "NO_FOOD_COUPON", message: "This pass does not include a food coupon", pass });
            }
            if (pass.foodClaimed) {
                return res.json({ success: false, status: 'error', code: "ALREADY_CLAIMED", message: "Food Coupon was already claimed for this pass!", pass });
            }
            pass.foodClaimed = true;
            pass.foodClaimedAt = new Date().toISOString();
            return res.json({ success: true, status: 'success', code: "FOOD_CLAIMED", message: "Food Coupon claimed successfully!", pass });
        }

        if (action === 'checkin' || action === 'scan' || !action) {
            if (pass.status === "Checked In" && action === 'scan') {
                return res.json({ 
                    success: true, 
                    status: 'success', 
                    code: "ALREADY_CHECKED_IN",
                    message: `Member ${pass.memberName} was ALREADY checked in at ${pass.checkedInAt ? new Date(pass.checkedInAt).toLocaleTimeString() : 'earlier'}`,
                    pass 
                });
            }
            pass.status = "Checked In";
            if (!pass.checkedInAt) pass.checkedInAt = new Date().toISOString();
            if (gate) pass.gate = gate;
            return res.json({ 
                success: true, 
                status: 'success', 
                code: "ACCESS_GRANTED",
                message: `ACCESS GRANTED! Welcome ${pass.memberName} (${pass.passType})`,
                pass 
            });
        }
    } catch (err) {
        res.status(500).json({ success: false, status: 'error', message: err.message });
    }
};

exports.getEntryPassStats = async (req, res) => {
    try {
        const totalPasses = entryPassesStore.length;
        const checkedIn = entryPassesStore.filter(p => p.status === "Checked In").length;
        const pending = totalPasses - checkedIn;
        const vips = entryPassesStore.filter(p => p.passType.includes("VIP")).length;
        const foodClaimed = entryPassesStore.filter(p => p.foodClaimed).length;
        res.json({
            success: true,
            stats: { totalPasses, checkedIn, pending, vips, foodClaimed }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


