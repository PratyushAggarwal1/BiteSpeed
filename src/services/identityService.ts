import { PrismaClient, Contact, LinkPrecedence } from '@prisma/client';

const prisma = new PrismaClient();

interface IdentifyRequest {
  email: string | null;
  phoneNumber: string | null;
}

interface ConsolidatedContactResponse {
  primaryContactId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}

export async function processIdentity(
  data: IdentifyRequest
): Promise<ConsolidatedContactResponse> {
  const { email, phoneNumber } = data;

  // 1. Find existing contacts by email or phone number
  let matchingContacts: Contact[] = [];
  if (email || phoneNumber) {
    matchingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          email ? { email } : {},
          phoneNumber ? { phoneNumber } : {},
        ],
      },
      orderBy: {
        createdAt: 'asc', // Oldest first
      },
    });
  }

  if (matchingContacts.length === 0) {
    // 2. No existing contacts found - Create a new primary contact
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: LinkPrecedence.primary,
      },
    });
    return formatResponse(newContact, []);
  }

  // 3. Contacts found - Determine primary and secondary relationships
  let primaryContact = matchingContacts.find(c => c.linkPrecedence === LinkPrecedence.primary);
  
  // If multiple primary contacts were found due to OR condition (e.g. email from one primary, phone from another)
  // or if all found contacts are secondary, we need to find their true primary
  const allRelatedContactIds = new Set<number>();
  matchingContacts.forEach(c => {
    allRelatedContactIds.add(c.id);
    if (c.linkedId) {
      allRelatedContactIds.add(c.linkedId);
    }
  });

  const allRelatedContacts = await prisma.contact.findMany({
    where: {
      id: { in: Array.from(allRelatedContactIds) }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // The true primary is the oldest among all related contacts that is primary, or the oldest overall if no primary exists yet in this group
  // which shouldn't happen if data is consistent.
  primaryContact = allRelatedContacts.sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  if (primaryContact.linkPrecedence === LinkPrecedence.secondary && primaryContact.linkedId) {
    const rootPrimary = await prisma.contact.findUnique({ where: {id: primaryContact.linkedId }});
    if (rootPrimary) primaryContact = rootPrimary; // Should always be primary
  }
  

  // Check if the new request introduces a new primary that needs to be linked
  // This happens if the incoming email/phone matches separate primary contacts
  const distinctPrimaryContacts = allRelatedContacts.filter(c => c.linkPrecedence === LinkPrecedence.primary);
  if (distinctPrimaryContacts.length > 1) {
      // Multiple primary contacts are involved. Merge them.
      // The oldest one remains primary, others become secondary.
      const oldestPrimary = distinctPrimaryContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      primaryContact = oldestPrimary;

      const contactsToUpdate = distinctPrimaryContacts.filter(c => c.id !== oldestPrimary.id);
      
      for (const contactToDemote of contactsToUpdate) {
        // Demote this primary to secondary
        await prisma.contact.update({
          where: { id: contactToDemote.id },
          data: {
            linkedId: oldestPrimary.id,
            linkPrecedence: LinkPrecedence.secondary,
          },
        });
        // Also update any contacts that were linked to this now-demoted primary
        await prisma.contact.updateMany({
            where: { linkedId: contactToDemote.id },
            data: { linkedId: oldestPrimary.id }
        });
      }
  }


  // 4. Check if new information is provided that isn't already linked
  const primaryId = primaryContact.id;
  const allCurrentEmails = new Set<string | null>();
  const allCurrentPhones = new Set<string | null>();

  const relatedContactsForInfo = await prisma.contact.findMany({
      where: {
          OR: [
              { id: primaryId },
              { linkedId: primaryId }
          ]
      }
  });

  relatedContactsForInfo.forEach(c => {
      if (c.email) allCurrentEmails.add(c.email);
      if (c.phoneNumber) allCurrentPhones.add(c.phoneNumber);
  });
  if (primaryContact.email) allCurrentEmails.add(primaryContact.email);
  if (primaryContact.phoneNumber) allCurrentPhones.add(primaryContact.phoneNumber);


  const isNewEmail = email && !allCurrentEmails.has(email);
  const isNewPhone = phoneNumber && !allCurrentPhones.has(phoneNumber);

  if (isNewEmail || isNewPhone) {
    // Create a new secondary contact if new distinct info is provided
    // Only create if the exact combination of new email/phone doesn't already exist
    const existingSecondaryMatch = relatedContactsForInfo.find(
        c => (email && c.email === email) && (phoneNumber && c.phoneNumber === phoneNumber)
    );
    if (!existingSecondaryMatch && ( (email && isNewEmail) || (phoneNumber && isNewPhone) )) {
         await prisma.contact.create({
            data: {
                email: email,
                phoneNumber: phoneNumber,
                linkedId: primaryId,
                linkPrecedence: LinkPrecedence.secondary,
            },
        });
    }
  }

  // 5. Consolidate and return the response
  const finalPrimaryContact = await prisma.contact.findUniqueOrThrow({ where: { id: primaryId } });
  const secondaryContacts = await prisma.contact.findMany({
    where: {
      linkedId: primaryId,
    },
  });

  return formatResponse(finalPrimaryContact, secondaryContacts);
}

function formatResponse(
  primaryContact: Contact,
  secondaryContacts: Contact[]
): ConsolidatedContactResponse {
  const emails = new Set<string>();
  const phoneNumbers = new Set<string>();
  const secondaryContactIds = new Set<number>();

  if (primaryContact.email) emails.add(primaryContact.email);
  if (primaryContact.phoneNumber) phoneNumbers.add(primaryContact.phoneNumber);

  secondaryContacts.forEach((contact) => {
    if (contact.email) emails.add(contact.email);
    if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
    secondaryContactIds.add(contact.id);
  });
  
  // Ensure primary contact's info is first, if present
  let sortedEmails = Array.from(emails);
  if (primaryContact.email) {
    sortedEmails = [primaryContact.email, ...sortedEmails.filter(e => e !== primaryContact.email)];
  }

  let sortedPhoneNumbers = Array.from(phoneNumbers);
  if (primaryContact.phoneNumber) {
    sortedPhoneNumbers = [primaryContact.phoneNumber, ...sortedPhoneNumbers.filter(p => p !== primaryContact.phoneNumber)];
  }


  return {
    primaryContactId: primaryContact.id,
    emails: sortedEmails,
    phoneNumbers: sortedPhoneNumbers,
    secondaryContactIds: Array.from(secondaryContactIds),
  };
}