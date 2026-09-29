const express = require('express');
const router = express.Router();
const controller = require('../controllers/memberDataController');

router.use((req, res, next) => {
    console.log(`[MemberDataRoute] ${req.method} ${req.url}`);
    next();
});

// Master / Helper GET Endpoints
router.get('/shubhechhak/city', controller.getShubhechhakCities);
router.get('/shubhechhak', controller.getShubhechhakMembers);
router.get('/bloodGroup', controller.getBloodGroups);
router.get('/relation', controller.getRelations);
router.get('/profession', controller.getProfessions);
router.get('/marriagestatus', controller.getMarriageStatuses);
router.get('/city', controller.getCities);
router.get('/getTotalDonation', controller.getTotalDonation);
router.get('/donation', controller.getDonationData);
router.get('/donationData', controller.getDonationData);
router.get('/appPin', controller.getAppPin);

// Export & PDF Endpoints
router.get('/downloadDonationData', controller.downloadDonationData);
router.get('/downloadDonationPDF', controller.downloadDonationPDF);
router.get('/downloadMemberPDF', controller.downloadMemberPDF);
router.get('/downloadShubhechhakPDF', controller.downloadShubhechhakPDF);

// Lookup & Utility Endpoints
router.get('/flutter/download-zip', (req, res) => {
    const path = require('path');
    const zipPath = path.join(__dirname, '..', 'public', 'ubs_member_flutter_app.zip');
    res.download(zipPath, 'ubs_member_flutter_app.zip', (err) => {
        if (err && !res.headersSent) {
            res.status(500).send('Could not download Flutter app package.');
        }
    });
});
router.get('/flutter/source/:fileName', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const fileMap = {
        'main_screen': 'screens/main_screen.dart',
        'member_list': 'screens/member_list_screen.dart',
        'invoice_generator': 'screens/invoice_generator_screen.dart',
        'donation_summary': 'screens/donation_summary_screen.dart',
        'reports': 'screens/reports_screen.dart',
        'family_tree': 'screens/family_tree_screen.dart',
        'login': 'screens/login_screen.dart',
        'api_service': 'services/api_service.dart',
        'models': 'models/models.dart',
        'bloc': 'blocs/invoice_generator_bloc.dart',
        'history_modal': 'widgets/history_modal.dart'
    };
    const relPath = fileMap[req.params.fileName];
    if (!relPath) return res.status(404).send('File not mapped');
    const fullPath = path.join(__dirname, '..', '..', 'ubs-member-ui', 'ubs_member_data_flutter', 'lib', relPath);
    if (!fs.existsSync(fullPath)) return res.status(404).send('File not found: ' + relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    res.type('text/plain').send(content);
});
router.get('/fetchByMemberId/:memberId', controller.getMemberByMemberId);
router.get('/relationships', controller.getRelationships);
router.post('/relationships', controller.saveRelationship);
router.delete('/relationships/:id', controller.deleteRelationship);
router.get('/familyTree/:id', controller.getFamilyTree);
router.get('/ping', controller.ping);
router.get('/syncAllToContacts', controller.syncAllToContacts);
router.post('/syncAllToContacts', controller.syncAllToContacts);
router.post('/whatsapp/broadcast', controller.sendWhatsAppBroadcast);
router.post('/whatsapp', controller.sendWhatsAppBroadcast);

// EntryPass Portal & Scanner Endpoints
router.get('/entrypass/passes', controller.getEntryPasses);
router.get('/passes', controller.getEntryPasses);
router.get('/entrypass/stats', controller.getEntryPassStats);
router.get('/stats', controller.getEntryPassStats);
router.post('/entrypass/issue', controller.issueEntryPass);
router.post('/issue', controller.issueEntryPass);
router.post('/entrypass/scan', controller.scanEntryPass);
router.post('/scan', controller.scanEntryPass);

// Main Members GET Endpoints
router.get('/', controller.getAllMembers);
router.get('/:id', controller.getMemberById);

// Mutation Endpoints (POST / PUT / DELETE)
router.post('/addMember', controller.addMember);
router.post('/addShubhechhakMember', controller.addShubhechhakMember);
router.post('/createDonation', controller.createDonation);
router.post('/donation', controller.createDonation);
router.post('/', controller.addMember);

router.put('/updateMember', controller.updateMember);
router.put('/updateShubhechhakMember', controller.updateShubhechhakMember);
router.put('/shubhechhak/:id', controller.updateShubhechhakMember);
router.put('/:id', controller.updateMember);

router.delete('/shubhechhak/:id', controller.deleteShubhechhakMember);
router.delete('/donation/:id', controller.deleteDonation);
router.delete('/:id', controller.deleteMember);

module.exports = router;
