import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../widgets/ubs_loader.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:share_plus/share_plus.dart';

class DonationSummaryScreen extends StatefulWidget {
  const DonationSummaryScreen({super.key});

  @override
  State<DonationSummaryScreen> createState() => _DonationSummaryScreenState();
}

class _DonationSummaryScreenState extends State<DonationSummaryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiService _apiService = ApiService();
  
  List<DonationSummary> _summaries = [];
  List<Transaction> _transactions = [];
  bool _isLoading = true;
  int? _selectedYear;
  int? _selectedMonth;
  String? _selectedMonthName;
  String? _selectedDonationType;

  void _copyToClipboard(String label, String? value) {
    if (value == null || value.isEmpty) return;
    Clipboard.setData(ClipboardData(text: value));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Copied $label: $value'),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF4f46e5),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final summaries = await _apiService.getTotalDonation();
    setState(() {
      _summaries = summaries;
      if (_summaries.isNotEmpty) {
        _selectedYear = _summaries.first.year;
        _selectedMonth = _summaries.first.month;
        _selectedMonthName = _summaries.first.monthName;
        _loadTransactions(_selectedYear!, month: _selectedMonth);
      } else {
        _isLoading = false;
      }
    });
  }

  Future<void> _loadTransactions(int year, {int? month}) async {
    setState(() => _isLoading = true);
    final txs = await _apiService.getDonationData(
      year: year.toString(), 
      month: month,
      donationType: _selectedDonationType
    );
    setState(() {
      _transactions = txs;
      _isLoading = false;
    });
  }

  Future<void> _exportToPDF() async {
    setState(() => _isLoading = true);
    try {
      final Uint8List? data = await _apiService.fetchDonationPDF();
      if (data == null || data.isEmpty) {
        throw Exception('Failed to download PDF');
      }

      final directory = await getTemporaryDirectory();
      final file = File('${directory.path}/donation_summary.pdf');
      await file.writeAsBytes(data);
      
      await OpenFile.open(file.path);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error exporting PDF: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _confirmDeleteTransaction(Transaction tx) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Delete'),
        content: Text('Are you sure you want to delete the donation of ₹${tx.amount} from ${tx.name}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && tx.id != null) {
      setState(() => _isLoading = true);
      final success = await _apiService.deleteDonation(tx.id!);
      
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Transaction deleted successfully!'), backgroundColor: Colors.green),
          );
          _loadData(); // Re-load overview and transactions
        } else {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Error deleting transaction'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  Future<void> _regenerateInvoice(Transaction tx) async {
    setState(() => _isLoading = true);
    try {
      final requestData = {
        'id': tx.id,
        'memberId': tx.memberId,
        'amount': tx.amount,
        'name': tx.name,
        'mobile': tx.mobile,
        'paymentType': _mapPaymentType(tx.paymentType),
        'donationType': tx.donationType,
        'paymentNo': tx.paymentNo,
        'city': tx.city,
      };

      final result = await _apiService.submitDonation(requestData, generateOnly: true);

      if (result != null) {
        if (mounted) {
          _showSuccessDialog(result, 'Invoice regenerated successfully!');
        }
      } else {
        throw Exception('Failed to generate invoice');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _mapPaymentType(String pt) {
    switch (pt.toLowerCase()) {
      case 'cash':
        return 'રોકડા';
      case 'upi':
        return 'UPI';
      case 'cheque':
        return 'ચેક';
      default:
        return pt;
    }
  }

  void _showSuccessDialog(dynamic file, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(
          'Donation Slip Regenerated',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message),
            const SizedBox(height: 16),
            ConstrainedBox(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.4),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: kIsWeb 
                    ? Image.memory(file as Uint8List, fit: BoxFit.contain)
                    : Image.file(file as File, fit: BoxFit.contain),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              if (kIsWeb) {
                Share.shareXFiles([
                  XFile.fromData(
                    file as Uint8List,
                    name: 'donation_receipt.jpg',
                    mimeType: 'image/jpeg',
                  )
                ], text: 'Donation Slip');
              } else {
                Share.shareXFiles([XFile((file as File).path)], text: 'Donation Slip');
              }
            },
            icon: const Icon(Icons.share, color: Colors.white),
            label: const Text('Share', style: TextStyle(color: Colors.white)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF3B82F6),
            ),
          ),
          if (!kIsWeb)
            ElevatedButton.icon(
              onPressed: () => OpenFile.open((file as File).path),
              icon: const Icon(Icons.open_in_new, color: Colors.white),
              label: const Text('Open', style: TextStyle(color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10b981),
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Column(
        children: [
          _buildHeader(),
          Container(
            color: Colors.white,
            child: TabBar(
              controller: _tabController,
              labelColor: const Color(0xFF4f46e5),
              unselectedLabelColor: const Color(0xFF64748B),
              indicatorColor: const Color(0xFF4f46e5),
              indicatorWeight: 3,
              tabs: const [
                Tab(text: 'Overview'),
                Tab(text: 'Transactions'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildOverviewTab(),
                _buildTransactionsTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Donation Summary',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.picture_as_pdf_rounded, color: Colors.redAccent, size: 24),
            onPressed: _exportToPDF,
            tooltip: 'Export PDF',
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab() {
    if (_isLoading) return const UbsLoader(message: 'Loading Summary...');
    if (_summaries.isEmpty) return _buildEmptyState('No summary data available');

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _summaries.length,
        itemBuilder: (context, index) {
          final summary = _summaries[index];
          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(5),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        summary.monthName != null 
                            ? '${summary.monthName} - ${summary.year}' 
                            : 'Donation Summary - ${summary.year}',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF4f46e5)),
                      ),
                      const Icon(Icons.analytics_outlined, color: Color(0xFF4f46e5)),
                    ],
                  ),
                  const Divider(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildMetric('Entries', summary.totalEntries.toString(), Colors.blue),
                      _buildMetric('Total', '₹${summary.totalDonation.toStringAsFixed(0)}', Colors.green),
                      _buildMetric('Avg.', '₹${summary.avgDonation.toStringAsFixed(0)}', Colors.orange),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildMetric('UBS Fund', '₹${summary.ubsTotal.toStringAsFixed(0)}', const Color(0xFF4f46e5)),
                        _buildMetric('UBS Trust', '₹${summary.ubsTrustTotal.toStringAsFixed(0)}', const Color(0xFF9333ea)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildMetric(String label, String value, Color color) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
        const SizedBox(height: 6),
        Text(
          value,
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color),
        ),
      ],
    );
  }

  Widget _buildTransactionsTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Filter Transactions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<int>(
                          value: _selectedYear,
                          isExpanded: true,
                          hint: const Text('Year'),
                          items: _summaries
                              .map((s) => s.year)
                              .toSet()
                              .toList()
                              .map((year) => DropdownMenuItem(value: year, child: Text(year.toString())))
                              .toList(),
                          onChanged: (year) {
                            if (year != null && year != _selectedYear) {
                              setState(() {
                                _selectedYear = year;
                                _selectedMonth = null;
                                _selectedMonthName = null;
                              });
                              _loadTransactions(year);
                            }
                          },
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<int>(
                          value: _selectedMonth,
                          isExpanded: true,
                          hint: const Text('All Months'),
                          items: [
                            const DropdownMenuItem<int>(value: null, child: Text('All Months')),
                            ..._summaries
                                .where((s) => s.year == _selectedYear && s.month != null)
                                .map((s) => DropdownMenuItem(value: s.month, child: Text(s.monthName ?? 'Unknown')))
                                .toList(),
                          ],
                          onChanged: (month) {
                            if (month != _selectedMonth) {
                              setState(() {
                                _selectedMonth = month;
                                _selectedMonthName = month == null ? null : _summaries.firstWhere((s) => s.month == month).monthName;
                              });
                              _loadTransactions(_selectedYear!, month: month);
                            }
                          },
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String?>(
                          value: _selectedDonationType,
                          isExpanded: true,
                          hint: const Text('Type'),
                          items: const [
                            DropdownMenuItem<String?>(value: null, child: Text('All Types')),
                            DropdownMenuItem<String?>(value: 'UBS', child: Text('UBS')),
                            DropdownMenuItem<String?>(value: 'UBS Trust', child: Text('UBS Trust')),
                          ],
                          onChanged: (type) {
                            if (type != _selectedDonationType) {
                              setState(() {
                                _selectedDonationType = type;
                              });
                              _loadTransactions(_selectedYear!, month: _selectedMonth);
                            }
                          },
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: _isLoading 
              ? const UbsLoader(message: 'Loading Transactions...')
              : _transactions.isEmpty
                  ? _buildEmptyState('No transactions for ${_selectedMonthName ?? ""} $_selectedYear')
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _transactions.length,
                      itemBuilder: (context, index) {
                        final tx = _transactions[index];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.grey.shade100),
                          ),
                          child: GestureDetector(
                            onLongPress: () => _copyToClipboard('Transaction', '${tx.name}: ₹${tx.amount}'),
                            child: Row(
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: Colors.green.shade50,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Center(child: Text(tx.name.substring(0, 1), style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green.shade700))),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(tx.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                      Row(
                                        children: [
                                          Text('${tx.city} | ${tx.paymentType}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                                          if (tx.donationType != null && tx.donationType!.isNotEmpty) ...[
                                            const SizedBox(width: 8),
                                            _buildDonationTypeBadge(tx.donationType!),
                                          ],
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    GestureDetector(
                                      onLongPress: () => _copyToClipboard('Amount', tx.amount.toString()),
                                      child: Text('₹${tx.amount}', style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.green, fontSize: 16)),
                                    ),
                                    tx.paymentDate != null ? Text(tx.paymentDate!, style: TextStyle(fontSize: 10, color: Colors.grey.shade400)) : const SizedBox(),
                                  ],
                                ),
                                const SizedBox(width: 8),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent, size: 20),
                                  onPressed: () => _confirmDeleteTransaction(tx),
                                  tooltip: 'Delete Transaction',
                                ),
                                IconButton(
                                  icon: const Icon(Icons.receipt_long_outlined, color: Color(0xFF4f46e5), size: 20),
                                  onPressed: () => _regenerateInvoice(tx),
                                  tooltip: 'Regenerate Invoice',
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inbox_rounded, size: 64, color: Colors.grey.shade200),
          const SizedBox(height: 16),
          Text(message, style: TextStyle(color: Colors.grey.shade400, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildDonationTypeBadge(String type) {
    Color bg = const Color(0xFFF1F5F9);
    Color text = const Color(0xFF64748B);
    
    if (type == 'UBS') {
      bg = const Color(0xFFE0F2FE);
      text = const Color(0xFF0369A1);
    } else if (type == 'UBS Trust') {
      bg = const Color(0xFFFAF5FF);
      text = const Color(0xFF7E22CE);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(4)),
      child: Text(type, style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: text)),
    );
  }
}
