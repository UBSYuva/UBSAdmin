import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../models/models.dart';

class ApiService {
  // Uses relative path in web mode or fallback localhost for mobile/emulators.
  final Dio _dio = Dio(BaseOptions(
    baseUrl: kIsWeb ? '/api/' : 'http://localhost:3000/api/',
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
  ));

  Future<List<Member>> fetchMembers({int page = 1, int pageSize = 10, String? filter}) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'pageSize': pageSize,
      };
      if (filter != null && filter.trim().isNotEmpty) {
        queryParams['filter'] = filter.trim();
      }
      final response = await _dio.get('memberdata', queryParameters: queryParams);
      final dynamic rawData = response.data;
      final List<dynamic> data = rawData is List ? rawData : (rawData['Data'] ?? rawData['data'] ?? []);
      return data.map((e) => Member.fromJson(e)).toList();
    } catch (e, stack) {
      print('Error fetching members: $e');
      print('Stack trace: $stack');
      return [];
    }
  }

  Future<List<Member>> fetchShubhechhak({int page = 1, int pageSize = 10, String? filter}) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'pageSize': pageSize,
      };
      if (filter != null && filter.trim().isNotEmpty) {
        queryParams['filter'] = filter.trim();
      }
      final response = await _dio.get('memberdata/shubhechhak', queryParameters: queryParams);
      final dynamic rawData = response.data;
      final List<dynamic> data = rawData is List ? rawData : (rawData['Data'] ?? rawData['data'] ?? []);
      return data.map((e) => Member.fromJson(e)).toList();
    } catch (e) {
      print('Error fetching shubhechhak: $e');
      return [];
    }
  }

  Future<Member?> fetchMemberByMemberId(String id) async {
    try {
      final response = await _dio.get('memberdata/fetchByMemberId/$id');
      if (response.data != null) {
        return Member.fromJson(response.data);
      }
      return null;
    } catch (e) {
      print('Error fetching member: $e');
      return null;
    }
  }

  Future<List<DonationSummary>> getTotalDonation() async {
    try {
      final response = await _dio.get('memberdata/getTotalDonation');
      final List<dynamic> data = response.data is List ? response.data : response.data['value'] ?? [];
      return data.map((e) => DonationSummary.fromJson(e)).toList();
    } catch (e) {
      print('Error fetching total donation: $e');
      return [];
    }
  }

  Future<List<Transaction>> getDonationData({String? year, int? month, String? date, String? filter, String? donationType}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (year != null) queryParams['year'] = year;
      if (month != null) queryParams['month'] = month;
      if (date != null) queryParams['date'] = date;
      if (filter != null) queryParams['filter'] = filter;
      if (donationType != null) queryParams['donationType'] = donationType;
      
      final response = await _dio.get('memberdata/donationData', queryParameters: queryParams);
      final List<dynamic> data = response.data is List ? response.data : response.data['Data'] ?? [];
      return data.map((e) => Transaction.fromJson(e)).toList();
    } catch (e) {
      print('Error fetching donation data: $e');
      return [];
    }
  }

  Future<List<Transaction>> fetchTodayDonations() async {
    return getDonationData(filter: 'today');
  }

  Future<dynamic> submitDonation(Map<String, dynamic> requestData, {bool generateOnly = false, bool saveOnly = false}) async {
    try {
      final response = await _dio.post(
        'memberdata/donation',
        data: {...requestData, 'generateOnly': generateOnly, 'saveOnly': saveOnly},
        options: Options(responseType: ResponseType.bytes),
      );
      
      final contentType = response.headers.value('content-type');
      if (contentType != null && contentType.contains('application/json')) {
        final decoded = jsonDecode(utf8.decode(response.data as List<int>));
        return decoded;
      }
      
      if (kIsWeb) {
        return response.data; // Return Uint8List on Web
      }

      final directory = await getTemporaryDirectory();
      final String timestamp = DateTime.now().millisecondsSinceEpoch.toString();
      final file = File('${directory.path}/${requestData['name']}_$timestamp.jpg');
      await file.writeAsBytes(response.data);
      return file;
    } catch (e) {
      print('Donation submission error: $e');
      return null;
    }
  }

  Future<bool> upsertMember(Map<String, dynamic> data, {String? id}) async {
    try {
      if (id != null && id.isNotEmpty) {
        await _dio.put('memberdata/$id', data: data);
      } else {
        await _dio.post('memberdata', data: data);
      }
      return true;
    } catch (e) {
      print('Error upserting member: $e');
      return false;
    }
  }

  Future<bool> upsertShubhechhak(Map<String, dynamic> data, {String? id}) async {
    try {
      if (id != null && id.isNotEmpty) {
        await _dio.put('memberdata/shubhechhak/$id', data: data);
      } else {
        await _dio.post('memberdata/shubhechhak', data: data);
      }
      return true;
    } catch (e) {
      print('Error upserting shubhechhak: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>?> fetchRolePins() async {
    try {
      final response = await _dio.get('memberdata/appPin');
      return response.data is Map<String, dynamic> ? response.data : null;
    } catch (e) {
      print('Error fetching role pins: $e');
      return null;
    }
  }

  Future<Uint8List?> fetchMemberPDF() async {
    try {
      final response = await _dio.get('memberdata/downloadMemberPDF', options: Options(responseType: ResponseType.bytes));
      return response.data;
    } catch (e) {
      print('Error downloading Member PDF: $e');
      return null;
    }
  }

  Future<Uint8List?> fetchShubhechhakPDF() async {
    try {
      final response = await _dio.get('memberdata/downloadShubhechhakPDF', options: Options(responseType: ResponseType.bytes));
      return response.data;
    } catch (e) {
      print('Error downloading Shubhechhak PDF: $e');
      return null;
    }
  }

  Future<Uint8List?> fetchDonationPDF() async {
    try {
      final response = await _dio.get('memberdata/downloadDonationPDF', options: Options(responseType: ResponseType.bytes));
      return response.data;
    } catch (e) {
      print('Error downloading Donation PDF: $e');
      return null;
    }
  }

  Future<Map<String, List<String>>> fetchMasters({bool isShubhechhak = false}) async {
    try {
      final responses = await Future.wait([
        _dio.get('memberdata/bloodGroup'),
        _dio.get('memberdata/relation'),
        _dio.get('memberdata/marriageStatus'),
        _dio.get('memberdata/profession'),
        _dio.get(isShubhechhak ? 'memberdata/shubhechhakCity' : 'memberdata/city'),
      ]);
      
      return {
        'bloodGroup': (responses[0].data as List).map((e) => (e['bloodGroup'] ?? '').toString()).where((v) => v.isNotEmpty && v != 'null').toList(),
        'relation': (responses[1].data as List).map((e) => (e['relation'] ?? '').toString()).where((v) => v.isNotEmpty && v != 'null').toList(),
        'marriageStatus': (responses[2].data as List).map((e) => (e['marriageStatus'] ?? e['marriagestatus'] ?? '').toString()).where((v) => v.isNotEmpty && v != 'null').toList(),
        'profession': (responses[3].data as List).map((e) => (e['profession'] ?? '').toString()).where((v) => v.isNotEmpty && v != 'null').toList(),
        'city': (responses[4].data as List).map((e) => (e['city'] ?? '').toString()).where((v) => v.isNotEmpty && v != 'null').toList(),
      };
    } catch (e) {
      print('Error fetching masters: $e');
      return {};
    }
  }

  Future<bool> deleteMember(int id) async {
    try {
      await _dio.delete('memberdata/$id');
      return true;
    } catch (e) {
      print('Error deleting member: $e');
      return false;
    }
  }

  Future<bool> deleteShubhechhak(int id) async {
    try {
      await _dio.delete('memberdata/shubhechhak/$id');
      return true;
    } catch (e) {
      print('Error deleting shubhechhak: $e');
      return false;
    }
  }

  Future<bool> deleteDonation(String id) async {
    try {
      await _dio.delete('memberdata/donation/$id');
      return true;
    } catch (e) {
      print('Error deleting donation: $e');
      return false;
    }
  }
}
