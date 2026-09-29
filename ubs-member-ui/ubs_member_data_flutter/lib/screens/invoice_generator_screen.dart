import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:share_plus/share_plus.dart';
import 'package:open_file/open_file.dart';
import '../blocs/invoice_generator_bloc.dart';
import '../widgets/history_modal.dart';
import 'package:intl/intl.dart';
import '../widgets/ubs_loader.dart';

class InvoiceGeneratorScreen extends StatefulWidget {
  const InvoiceGeneratorScreen({super.key});

  @override
  State<InvoiceGeneratorScreen> createState() => _InvoiceGeneratorScreenState();
}

class _InvoiceGeneratorScreenState extends State<InvoiceGeneratorScreen> {
  final _formKey = GlobalKey<FormState>();

  // Controllers
  final _memberIdController = TextEditingController();
  final _nameController = TextEditingController();
  final _cityController = TextEditingController();
  final _mobileController = TextEditingController();
  final _amountController = TextEditingController(text: '0');
  final _paymentNoController = TextEditingController();
  String _paymentType = 'રોકડા'; // Default Cash
  String _donationType = 'UBS'; // Default UBS
  Map<String, List<String>> _masters = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InvoiceGeneratorBloc>().add(LoadTodayDonationsEvent());
      context.read<InvoiceGeneratorBloc>().add(LoadMastersEvent());
    });
  }

  bool _isSearching = false;
  bool _isLoading = false;
  double _todayTotal = 0.0;

  void _resetForm() {
    setState(() {
      _memberIdController.clear();
      _nameController.clear();
      _cityController.clear();
      _mobileController.clear();
      _amountController.text = '0';
      _paymentNoController.clear();
      _paymentType = 'રોકડા';
      _donationType = 'UBS';
    });
    context.read<InvoiceGeneratorBloc>().add(ResetFormEvent());
  }

  void _submitDonation({bool generateOnly = false, bool saveOnly = false}) {
    if (_formKey.currentState!.validate()) {
      final requestData = {
        'memberId': _memberIdController.text.isEmpty
            ? null
            : _memberIdController.text,
        'amount': double.tryParse(_amountController.text) ?? 0,
        'name': _nameController.text,
        'mobile': _mobileController.text,
        'paymentType': _paymentType,
        'donationType': _donationType,
        'paymentNo': _paymentNoController.text,
        'city': _cityController.text,
      };
      context.read<InvoiceGeneratorBloc>().add(
        SubmitDonationEvent(requestData, generateOnly: generateOnly, saveOnly: saveOnly),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent, // Let MainScreen handle background
      body: BlocListener<InvoiceGeneratorBloc, InvoiceGeneratorState>(
        listener: (context, state) {
          if (state is MemberSearchLoading) {
            setState(() => _isSearching = true);
          } else if (state is MemberFoundState) {
            setState(() {
              _isSearching = false;
              _nameController.text = state.member.name;
              _cityController.text = state.member.city;
              _mobileController.text = state.member.mobile ?? '';
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Member found!'),
                backgroundColor: Colors.green,
              ),
            );
          } else if (state is MemberNotFoundState) {
            setState(() => _isSearching = false);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Member not found.'),
                backgroundColor: Colors.orange,
              ),
            );
          } else if (state is TodayDonationsLoaded) {
            setState(() {
              _todayTotal = state.totalToday;
            });
          } else if (state is DonationSubmitting) {
            setState(() => _isLoading = true);
          } else if (state is DonationSuccessState) {
            setState(() => _isLoading = false);
            _showSuccessDialog(state.file, state.message);
            // Reload today's total after successful donation
            context.read<InvoiceGeneratorBloc>().add(LoadTodayDonationsEvent());
          } else if (state is MastersLoadedState) {
            setState(() {
              _masters = state.masters;
            });
          } else if (state is DonationErrorState) {
            setState(() => _isLoading = false);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.error), backgroundColor: Colors.red),
            );
          }
        },
        child: Stack(
          children: [
            SingleChildScrollView(
              child: Column(
                children: [
                  _buildHeader(),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: _buildForm(),
                  ),
                ],
              ),
            ),
            if (_isLoading) 
              const UbsLoader(message: 'Generating Receipt...', isFullScreen: true),
          ],
        ),
      ),

    );
  }

  Widget _buildHeader() {
    final currencyFormat = NumberFormat.currency(symbol: '₹', decimalDigits: 0, locale: 'en_IN');

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Generate Invoice',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
            ),
          ),
          BlocBuilder<InvoiceGeneratorBloc, InvoiceGeneratorState>(
            builder: (context, state) {
              final totalLabel = currencyFormat.format(_todayTotal);

              return InkWell(
                onTap: () => HistoryModal.show(context),
                onLongPress: () {
                  if (_todayTotal > 0) {
                    Clipboard.setData(ClipboardData(text: _todayTotal.toString()));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Today\'s Total copied to clipboard'),
                        duration: Duration(seconds: 1),
                        behavior: SnackBarBehavior.floating,
                        backgroundColor: Color(0xFF4f46e5),
                      ),
                    );
                  }
                },
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_todayTotal > 0) ...[
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text(
                              'TODAY\'S TOTAL',
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.5),
                            ),
                            Text(
                              totalLabel,
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF10b981)),
                            ),
                          ],
                        ),
                        const SizedBox(width: 8),
                      ],
                      const Icon(Icons.receipt_long_rounded, color: Color(0xFF4f46e5), size: 24),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildForm() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4f46e5).withAlpha(15),
            blurRadius: 40,
            offset: const Offset(0, 20),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSectionTitle(Icons.person_pin_rounded, 'Donar Information'),
              const SizedBox(height: 20),
              _buildTextField(
                controller: _memberIdController,
                label: 'Member ID (Optional)',
                icon: Icons.tag_rounded,
                onFieldSubmitted: (val) => context
                    .read<InvoiceGeneratorBloc>()
                    .add(SearchMemberEvent(val)),
                suffix: _isSearching
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: UbsLoader(),
                      )
                    : IconButton(
                        icon: const Icon(
                          Icons.search_rounded,
                          color: Color(0xFF4f46e5),
                        ),
                        onPressed: () => context
                            .read<InvoiceGeneratorBloc>()
                            .add(SearchMemberEvent(_memberIdController.text)),
                      ),
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _nameController,
                label: 'Full Name *',
                icon: Icons.person,
                validator: (val) =>
                    (val == null || val.isEmpty) ? 'Please enter name' : null,
              ),
              const SizedBox(height: 16),
              _buildAutocomplete(
                controller: _cityController,
                label: 'City/Town',
                icon: Icons.location_on,
                options: _masters['city'] ?? [],
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _mobileController,
                label: 'Mobile Number',
                icon: Icons.phone_android,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 24),
              _buildSectionTitle(Icons.currency_rupee, 'Payment Details'),
              const SizedBox(height: 16),
              _buildAmountField(),
              const SizedBox(height: 16),
              _buildDonationTypeDropdown(),
              const SizedBox(height: 16),
              _buildPaymentTypeDropdown(),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _paymentNoController,
                label: 'Ref No. (Cheque / UPI)',
                icon: Icons.numbers,
                enabled: _paymentType != 'રોકડા',
              ),
              const SizedBox(height: 32),
              _buildActionButtons(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(IconData icon, String title) {
    return Container(
      padding: const EdgeInsets.only(left: 8),
      decoration: const BoxDecoration(
        border: Border(left: BorderSide(color: Color(0xFF3b82f6), width: 4)),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF1E293B)),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    bool enabled = true,
    String? Function(String?)? validator,
    Widget? suffix,
    void Function(String)? onFieldSubmitted,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            color: Color(0xFF64748B),
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          enabled: enabled,
          validator: validator,
          onFieldSubmitted: onFieldSubmitted,
          decoration: InputDecoration(
            prefixIcon: Icon(icon, color: const Color(0xFF94A3B8)),
            suffixIcon: suffix,
            hintText: label,
          ),
        ),
      ],
    );
  }

  Widget _buildAmountField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Donation Amount *',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: Color(0xFF64748B),
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _amountController,
          keyboardType: TextInputType.number,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 18,
            color: Color(0xFF059669),
          ),
          validator: (val) {
            final n = double.tryParse(val ?? '');
            if (n == null || n <= 0) return 'Please enter valid amount';
            return null;
          },
          decoration: InputDecoration(
            prefixIcon: const Padding(
              padding: EdgeInsets.only(left: 16, top: 10),
              child: Text(
                '₹',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF10b981),
                ),
              ),
            ),
            hintText: '0.00',
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentTypeDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Payment Type *',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: Color(0xFF64748B),
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _paymentType,
          onChanged: (val) {
            setState(() {
              _paymentType = val!;
              if (_paymentType == 'રોકડા') {
                _paymentNoController.clear();
              }
            });
          },
          items: const [
            DropdownMenuItem(value: 'રોકડા', child: Text('Cash (રોકડા)')),
            DropdownMenuItem(value: 'UPI', child: Text('Digital (UPI)')),
            DropdownMenuItem(value: 'ચેક', child: Text('Cheque (ચેક)')),
          ],
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.credit_card, color: Color(0xFF94A3B8)),
          ),
        ),
      ],
    );
  }

  Widget _buildDonationTypeDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Donation Type *',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: Color(0xFF64748B),
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _donationType,
          onChanged: (val) {
            setState(() {
              _donationType = val!;
            });
          },
          items: const [
            DropdownMenuItem(value: 'UBS', child: Text('UBS')),
            DropdownMenuItem(value: 'UBS Trust', child: Text('UBS Trust')),
          ],
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.account_balance_rounded, color: Color(0xFF94A3B8)),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _resetForm,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text(
                  'Reset',
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton(
                onPressed: _isLoading
                    ? null
                    : () => _submitDonation(generateOnly: true),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF3B82F6), width: 2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text(
                  'Generate',
                  style: TextStyle(
                    color: Color(0xFF3B82F6),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _isLoading
                    ? null
                    : () => _submitDonation(saveOnly: true),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF10b981), width: 2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text(
                  'Save',
                  style: TextStyle(
                    color: Color(0xFF10b981),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: _isLoading
                    ? null
                    : () => _submitDonation(generateOnly: false),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B82F6),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  elevation: 2,
                ),
                child: const Text(
                  'Save & Generate',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAutocomplete({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required List<String> options,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            color: Color(0xFF64748B),
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 8),
        LayoutBuilder(
          builder: (context, constraints) => Autocomplete<String>(
            optionsBuilder: (TextEditingValue textEditingValue) {
              if (textEditingValue.text.isEmpty) {
                return options;
              }
              return options.where((String option) {
                return option.toLowerCase().contains(textEditingValue.text.toLowerCase());
              });
            },
            onSelected: (String selection) {
              controller.text = selection;
            },
            fieldViewBuilder: (context, textController, focusNode, onFieldSubmitted) {
              // Sync the textController with our external controller if needed
              if (textController.text != controller.text) {
                textController.text = controller.text;
              }
              textController.addListener(() {
                controller.text = textController.text;
              });

              return TextFormField(
                controller: textController,
                focusNode: focusNode,
                validator: validator,
                decoration: InputDecoration(
                  prefixIcon: Icon(icon, color: const Color(0xFF94A3B8)),
                  hintText: label,
                ),
              );
            },
            optionsViewBuilder: (context, onSelected, options) {
              return Align(
                alignment: Alignment.topLeft,
                child: Material(
                  elevation: 4,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: constraints.maxWidth,
                    constraints: const BoxConstraints(maxHeight: 200),
                    child: ListView.builder(
                      padding: EdgeInsets.zero,
                      shrinkWrap: true,
                      itemCount: options.length,
                      itemBuilder: (BuildContext context, int index) {
                        final String option = options.elementAt(index);
                        return ListTile(
                          title: Text(option),
                          onTap: () => onSelected(option),
                        );
                      },
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  void _showSuccessDialog(dynamic file, String message) {
    if (file == null) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green),
              SizedBox(width: 8),
              Text('Success'),
            ],
          ),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _resetForm();
              },
              child: const Text('OK'),
            ),
          ],
        ),
      );
      return;
    }
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(
          'Donation Slip Generated',
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
}
