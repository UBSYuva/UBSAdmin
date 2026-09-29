const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

class GoogleContactsService {
    constructor() {
        const authConfig = {
            scopes: [
                'https://www.googleapis.com/auth/contacts',
                'https://www.googleapis.com/auth/contacts.readonly'
            ],
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
                parsedCreds.private_key = parsedCreds.private_key.replaceAll('\\n', '\n');
            }
            authConfig.credentials = parsedCreds;
            console.log(`ContactsService: Successfully loaded Google Service Account credentials (${parsedCreds.client_email}).`);
        } else if (googleAppCreds && fs.existsSync(googleAppCreds)) {
            authConfig.keyFile = googleAppCreds;
        }

        this.auth = new google.auth.GoogleAuth(authConfig);
        this.people = google.people({ version: 'v1', auth: this.auth });
    }

    async syncMember(member, type) {
        try {
            const memberId = member.memberId || member.MemberId;
            const name = member.name || member.Name;
            const mobile = member.mobile || member.Mobile;
            const city = member.city || member.City;

            if (!memberId || !name) {
                console.log('Skipping contact sync: missing memberId or name');
                return;
            }

            const prefix = type === 'Ajivan' ? 'A' : 'S';
            const contactName = `UBS - ${prefix} - ${memberId} ${name}`;

            // Search for existing contact with this memberId in the name
            // We search for "UBS - {prefix} - {memberId}" to find the contact
            const searchPattern = `UBS - ${prefix} - ${memberId}`;
            const existingContact = await this.findContactByPattern(searchPattern);

            const contactData = {
                names: [{ displayName: contactName, givenName: contactName }],
                phoneNumbers: mobile ? [{ value: mobile, type: 'mobile' }] : [],
                addresses: city ? [{ city: city, type: 'home' }] : [],
                notes: `System ID: ${member._id || ''}, Member ID: ${memberId}, Type: ${type}`
            };

            if (existingContact) {
                console.log(`Updating existing contact for ${searchPattern}`);
                await this.people.people.updateContact({
                    resourceName: existingContact.resourceName,
                    updatePersonFields: 'names,phoneNumbers,addresses,notes',
                    requestBody: {
                        ...contactData,
                        etag: existingContact.etag
                    }
                });
            } else {
                console.log(`Creating new contact: ${contactName}`);
                await this.people.people.createContact({
                    requestBody: contactData
                });
            }
        } catch (error) {
            console.error('Error syncing contact to Google:', error.response?.data || error.message);
        }
    }

    async findContactByExactName(exactName) {
        try {
            const response = await this.people.people.searchContacts({
                query: exactName,
                readMask: 'names,metadata'
            });

            if (response.data.results && response.data.results.length > 0) {
                const match = response.data.results.find(res => {
                    const name = res.person.names?.[0]?.displayName || '';
                    return name === exactName;
                });
                
                if (match) {
                    const person = await this.people.people.get({
                        resourceName: match.person.resourceName,
                        personFields: 'names,metadata'
                    });
                    return person.data;
                }
            }
            return null;
        } catch (error) {
            console.error('Error searching contacts:', error.message);
            return null;
        }
    }

    async findContactByPattern(pattern) {
        try {
            const response = await this.people.people.searchContacts({
                query: pattern,
                readMask: 'names,metadata'
            });

            if (response.data.results && response.data.results.length > 0) {
                // Return the first one that starts with the pattern (likely the correct memberId)
                const match = response.data.results.find(res => {
                    const name = res.person.names?.[0]?.displayName || '';
                    return name.startsWith(pattern);
                });
                
                if (match) {
                    const person = await this.people.people.get({
                        resourceName: match.person.resourceName,
                        personFields: 'names,metadata'
                    });
                    return person.data;
                }
            }
            return null;
        } catch (error) {
            console.error('Error searching contacts by pattern:', error.message);
            return null;
        }
    }

    async deleteContact(memberId, name, type) {
        try {
            const prefix = type === 'Ajivan' ? 'A' : 'S';
            const contactName = `UBS - ${prefix} - ${memberId} ${name}`;
            const contact = await this.findContactByExactName(contactName);
            
            if (contact) {
                await this.people.people.deleteContact({
                    resourceName: contact.resourceName
                });
                console.log(`Deleted contact: ${contactName}`);
            }
        } catch (error) {
            console.error('Error deleting contact from Google:', error.message);
        }
    }
}

module.exports = new GoogleContactsService();
