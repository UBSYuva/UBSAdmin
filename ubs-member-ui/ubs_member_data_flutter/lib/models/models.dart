class Member {
  final int? id;
  final String? memberId;
  final String name;
  final String? relation;
  final String? dob;
  final String? marriageStatus;
  final String? profession;
  final String? designation;
  final String? company;
  final String? mobile;
  final String? bloodGroup;
  final String? gender;
  final String city;
  final String? address;
  final String? companyAddress;
  final String? lead;
  final String? parentId;
  final String? lastUpdated;
  final bool? mobileVerified;

  Member({
    this.id,
    this.memberId,
    required this.name,
    this.relation,
    this.dob,
    this.marriageStatus,
    this.profession,
    this.designation,
    this.company,
    this.mobile,
    this.bloodGroup,
    this.gender,
    required this.city,
    this.address,
    this.companyAddress,
    this.lead,
    this.parentId,
    this.lastUpdated,
    this.mobileVerified = false,
  });

  factory Member.fromJson(Map<String, dynamic> json) {
    dynamic idVal = json['Id'] ?? json['id'];
    int? parsedId = idVal is int ? idVal : int.tryParse(idVal?.toString() ?? '');

    return Member(
      id: parsedId,
      memberId: (json['Member Id'] ?? json['memberId'] ?? '').toString(),
      name: json['Name'] ?? json['name'] ?? 'Unknown Member',
      relation: json['Relation'] ?? json['relation'] ?? '',
      dob: json['Date Of Birth'] ?? json['dob'] ?? '',
      marriageStatus: json['Married'] ?? json['marriageStatus'] ?? '',
      profession: json['Profession'] ?? json['profession'] ?? '',
      designation: json['Designation'] ?? json['designation'] ?? '',
      company: json['Company'] ?? json['company'] ?? '',
      mobile: (json['Mobile'] ?? json['mobile'] ?? '').toString(),
      bloodGroup: json['Blood Group'] ?? json['bloodGroup'] ?? '',
      gender: json['Gender'] ?? json['gender'] ?? '',
      city: json['City'] ?? json['city'] ?? 'N/A',
      address: json['Address'] ?? json['address'] ?? '',
      companyAddress: json['Company Address'] ?? json['companyAddress'] ?? '',
      lead: (json['Lead'] ?? json['lead'] ?? '').toString(),
      parentId: (json['ParentId'] ?? json['parentId'] ?? '').toString(),
      lastUpdated: json['LastUpdated'] ?? json['last_updated'] ?? '',
      mobileVerified: json['MobileVerified'] == true || json['mobile_verified'] == 'true',
    );
  }

  Map<String, dynamic> toJson() => {
        'Id': id,
        'Member Id': memberId,
        'Name': name,
        'Relation': relation,
        'Date Of Birth': dob,
        'Married': marriageStatus,
        'Profession': profession,
        'Designation': designation,
        'Company': company,
        'Mobile': mobile,
        'Blood Group': bloodGroup,
        'Gender': gender,
        'City': city,
        'Address': address,
        'Company Address': companyAddress,
        'Lead': lead,
        'ParentId': parentId,
        'LastUpdated': lastUpdated,
        'MobileVerified': mobileVerified,
      };
}

class DonationSummary {
  final int year;
  final int? month;
  final String? monthName;
  final double totalDonation;
  final int totalEntries;
  final double avgDonation;
  final double ubsTotal;
  final double ubsTrustTotal;

  DonationSummary({
    required this.year,
    this.month,
    this.monthName,
    required this.totalDonation,
    required this.totalEntries,
    required this.avgDonation,
    this.ubsTotal = 0.0,
    this.ubsTrustTotal = 0.0,
  });

  factory DonationSummary.fromJson(Map<String, dynamic> json) {
    return DonationSummary(
      year: json['year'] ?? 0,
      month: json['month'],
      monthName: json['monthName'],
      totalDonation: double.tryParse(json['totalDonation']?.toString() ?? '0') ?? 0.0,
      totalEntries: int.tryParse(json['totalEntries']?.toString() ?? '0') ?? 0,
      avgDonation: double.tryParse(json['avgDonation']?.toString() ?? '0') ?? 0.0,
      ubsTotal: double.tryParse(json['ubsTotal']?.toString() ?? '0') ?? 0.0,
      ubsTrustTotal: double.tryParse(json['ubsTrustTotal']?.toString() ?? '0') ?? 0.0,
    );
  }
}

class Transaction {
  final String? id;
  final String memberId;
  final String name;
  final String city;
  final String mobile;
  final String paymentType;
  final String? donationType;
  final String? paymentNo;
  final String? paymentDate;
  final bool? mobileVerified;
  final double amount;

  Transaction({
    this.id,
    required this.memberId,
    required this.name,
    required this.city,
    required this.mobile,
    required this.paymentType,
    this.donationType,
    this.paymentNo,
    this.paymentDate,
    this.mobileVerified = false,
    required this.amount,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id']?.toString(),
      memberId: (json['Member Id'] ?? json['memberId'] ?? '').toString(),
      name: json['Name'] ?? json['name'] ?? '',
      city: json['City'] ?? json['city'] ?? '',
      mobile: (json['Mobile'] ?? json['mobile'] ?? '').toString(),
      paymentType: json['PaymentType'] ?? json['paymentType'] ?? '',
      donationType: json['DonationType'] ?? json['donationType'] ?? '',
      paymentNo: (json['PaymentNo'] ?? json['paymentNo'] ?? '').toString(),
      paymentDate: json['PaymentDate'] ?? json['paymentDate'] ?? '',
      mobileVerified: json['MobileVerified'] == true || json['mobile_verified'] == 'true',
      amount: double.tryParse(json['Amount']?.toString() ?? '0') ?? 0.0,
    );
  }
}

enum UserRole {
  admin,
  viewMembers,
  donationInvoice,
  onlyView
}
