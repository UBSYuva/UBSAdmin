import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../blocs/invoice_generator_bloc.dart';
import '../models/models.dart';

class HistoryModal extends StatelessWidget {
  const HistoryModal({super.key});

  static void show(BuildContext context) {
    context.read<InvoiceGeneratorBloc>().add(LoadTodayDonationsEvent());
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const HistoryModal(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: '₹', decimalDigits: 2, locale: 'en_IN');

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
      ),
      child: Column(
        children: [
          _buildHeader(context),
          Expanded(
            child: BlocBuilder<InvoiceGeneratorBloc, InvoiceGeneratorState>(
              builder: (context, state) {
                if (state is DonationHistoryLoading) {
                  return const Center(child: CircularProgressIndicator());
                } else if (state is TodayDonationsLoaded) {
                  return _buildTodayList(context, state.transactions, state.totalToday, currencyFormat);
                } else if (state is DonationHistoryLoaded) {
                  return _buildHistoryList(context, state.summaries, currencyFormat);
                } else if (state is YearlyTransactionsLoaded) {
                  return _buildHistoryList(context, state.summaries, currencyFormat);
                }
                return const Center(child: Text('No donations for today.'));
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: Color(0xFFF8FAFC),
        borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
        border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text('Today\'s Donation History', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
          IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
        ],
      ),
    );
  }

  void _copyToClipboard(BuildContext context, String label, String value) {
    if (value.isEmpty) return;
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

  Widget _buildTodayList(BuildContext context, List<Transaction> transactions, double total, NumberFormat currency) {
    if (transactions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history_rounded, size: 64, color: Colors.grey.shade200),
            const SizedBox(height: 16),
            const Text('No donations recorded today.', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w500)),
          ],
        ),
      );
    }

    return Column(
      children: [
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF10b981).withAlpha(10),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF10b981).withAlpha(30)),
          ),
          child: InkWell(
            onLongPress: () => _copyToClipboard(context, 'Today Total', total.toString()),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('TODAY\'S TOTAL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF065F46), letterSpacing: 1)),
                    SizedBox(height: 4),
                    Text('Collection Summary', style: TextStyle(fontSize: 12, color: Color(0xFF047857))),
                  ],
                ),
                Text(currency.format(total), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF047857))),
              ],
            ),
          ),
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            itemCount: transactions.length,
            separatorBuilder: (context, index) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
            itemBuilder: (context, index) {
              final tx = transactions[index];
              return ListTile(
                onLongPress: () => _copyToClipboard(context, 'Donation', '${tx.name}: ${currency.format(tx.amount)}'),
                contentPadding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                leading: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(color: const Color(0xFF4f46e5).withAlpha(10), borderRadius: BorderRadius.circular(12)),
                  child: Center(child: Text(tx.name.substring(0, 1), style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF4f46e5)))),
                ),
                title: Text(tx.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1E293B))),
                subtitle: Text('${tx.memberId} • ${tx.city}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                trailing: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(currency.format(tx.amount), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF10b981))),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (tx.donationType != null && tx.donationType!.isNotEmpty) ...[
                          _buildDonationTypeBadge(tx.donationType!),
                          const SizedBox(width: 4),
                        ],
                        _buildBadge(tx.paymentType),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildHistoryList(BuildContext context, List<DonationSummary> summaries, NumberFormat currency) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: summaries.length,
      itemBuilder: (context, index) {
        final summary = summaries[index];
        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16), 
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          margin: const EdgeInsets.only(bottom: 16),
          child: ExpansionTile(
            title: Text('Donation Year ${summary.year}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            onExpansionChanged: (expanded) {
              if (expanded) {
                context.read<InvoiceGeneratorBloc>().add(LoadYearlyTransactionsEvent(summary.year.toString()));
              }
            },
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildStat('Total Entries', summary.totalEntries.toString(), const Color(0xff1E293B)),
                    _buildStat('Total Donation', currency.format(summary.totalDonation), const Color(0xFF10b981)),
                    _buildStat('Avg. Donation', currency.format(summary.avgDonation), const Color(0xFF0EA5E9)),
                  ],
                ),
              ),
              const Divider(),
              BlocBuilder<InvoiceGeneratorBloc, InvoiceGeneratorState>(
                builder: (innerContext, state) {
                  if (state is YearlyTransactionsLoading) {
                    return const Padding(padding: EdgeInsets.all(16.0), child: Center(child: CircularProgressIndicator()));
                  } else if (state is YearlyTransactionsLoaded && state.year == summary.year.toString()) {
                    return _buildTransactionsList(innerContext, state.transactions, currency);
                  }
                  return const SizedBox.shrink();
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
        Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }

  Widget _buildTransactionsList(BuildContext context, List<Transaction> transactions, NumberFormat currency) {
    if (transactions.isEmpty) return const Padding(padding: EdgeInsets.all(16.0), child: Text('No transactions found.'));
    
    return Column(
      children: transactions.take(50).map((tx) {
        return ListTile(
          onLongPress: () => _copyToClipboard(context, 'Donation', '${tx.name}: ${currency.format(tx.amount)}'),
          dense: true,
          title: Text(tx.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          subtitle: Text('${tx.memberId} • ${tx.city}', style: const TextStyle(fontSize: 11)),
          trailing: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(currency.format(tx.amount), style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF10b981))),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (tx.donationType != null && tx.donationType!.isNotEmpty) ...[
                    _buildDonationTypeBadge(tx.donationType!),
                    const SizedBox(width: 4),
                  ],
                  _buildBadge(tx.paymentType),
                ],
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildBadge(String type) {
    Color bg = const Color(0xFFF1F5F9);
    Color text = const Color(0xFF64748B);
    
    if (type.contains('રોકડા') || type.toLowerCase().contains('cash')) {
      bg = const Color(0xFFDCFCE7);
      text = const Color(0xFF166534);
    } else if (type.contains('UPI')) {
      bg = const Color(0xFFDBEAFE);
      text = const Color(0xFF1E40AF);
    } else if (type.contains('ચેક') || type.toLowerCase().contains('cheque')) {
      bg = const Color(0xFFFEF3C7);
      text = const Color(0xFF92400E);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(4)),
      child: Text(type, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: text)),
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
      child: Text(type, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: text)),
    );
  }
}

// Extension to help preserve summary list during transition (optional optimization)
extension SummaryPreservation on InvoiceGeneratorState {
  List<DonationSummary> summaries_placeholder_logic(BuildContext context) {
    // In a real app, you might want to store the summaries in the BLoc state or a separate controller
    // For this demonstration, we'll just check if there's a cached version or return empty
    return [];
  }
}
