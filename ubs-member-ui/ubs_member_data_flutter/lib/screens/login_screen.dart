import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'main_screen.dart';
import '../models/models.dart';
import '../widgets/ubs_loader.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final ApiService _apiService = ApiService();
  final List<String> _pin = ['', '', '', ''];
  int _currentIndex = 0;
  Map<String, dynamic>? _rolePins;
  bool _isLoading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _loadPin();
  }

  Future<void> _loadPin() async {
    final pins = await _apiService.fetchRolePins();
    if (mounted) {
      setState(() {
        _rolePins = pins ?? {'admin': '1234'};
        _isLoading = false;
      });
    }
  }

  void _onNumberTap(int number) {
    if (_currentIndex < 4) {
      setState(() {
        _pin[_currentIndex] = number.toString();
        _currentIndex++;
        _error = '';
      });
      if (_currentIndex == 4) {
        _verifyPin();
      }
    }
  }

  void _onDelete() {
    if (_currentIndex > 0) {
      setState(() {
        _currentIndex--;
        _pin[_currentIndex] = '';
        _error = '';
      });
    }
  }

  Future<void> _verifyPin() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      final freshPins = await _apiService.fetchRolePins();
      if (freshPins != null) {
        setState(() {
          _rolePins = freshPins;
        });
      }
    } catch (e) {
      print('Error refreshing pins: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }

    final enteredPin = _pin.join();
    UserRole? role;

    final adminPin = _rolePins?['admin']?.toString() ?? '1222';
    final viewMembersPin = _rolePins?['viewMembers']?.toString() ?? '1223';
    final donationInvoicePin = _rolePins?['donationInvoice']?.toString() ?? '1224';
    final viewOnlyPin = _rolePins?['viewOnly']?.toString() ?? '1225';
    final masterPin = _rolePins?['pin']?.toString() ?? '1221';

    if (enteredPin == adminPin || enteredPin == masterPin || enteredPin == '2026' || enteredPin == '1222' || enteredPin == '1221') {
      role = UserRole.admin;
    } else if (enteredPin == viewMembersPin || enteredPin == '1111' || enteredPin == '1223') {
      role = UserRole.viewMembers;
    } else if (enteredPin == donationInvoicePin || enteredPin == '2222' || enteredPin == '1224') {
      role = UserRole.donationInvoice;
    } else if (enteredPin == viewOnlyPin || enteredPin == '3333' || enteredPin == '1225') {
      role = UserRole.onlyView;
    }

    if (role != null) {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => MainScreen(role: role!)),
        );
      }
    } else {
      if (mounted) {
        setState(() {
          _error = 'Invalid PIN ($enteredPin). Use 1222 (Admin), 1223 (Members), 1224 (Donation), 1225 (View)';
          for (int i = 0; i < 4; i++) {
            _pin[i] = '';
          }
          _currentIndex = 0;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: _isLoading 
        ? const UbsLoader(message: 'Securing Connection...')
        : Container(
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFF4f46e5), Color(0xFF6366f1)],
              ),
            ),
            child: SafeArea(
              child: SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: MediaQuery.of(context).size.height - MediaQuery.of(context).padding.top - MediaQuery.of(context).padding.bottom),
                child: IntrinsicHeight(
                  child: Column(
                    children: [
                      const SizedBox(height: 48),
                      // Logo/Header
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: ClipOval(
                          child: Image.asset('assets/logo.png', width: 120, height: 120, fit: BoxFit.cover),
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'UBS Seva Trust',
                        style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Enter your 4-digit security PIN',
                        style: TextStyle(color: Colors.white.withAlpha(180), fontSize: 16),
                      ),
                      const SizedBox(height: 48),
                      // PIN Display
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(4, (index) => _buildPinCircle(index)),
                      ),
                      if (_error.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 24),
                          child: Text(_error, style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                        ),
                      const Spacer(),
                      const SizedBox(height: 32),
                      // Numpad
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 32),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.only(topLeft: Radius.circular(40), topRight: Radius.circular(40)),
                        ),
                        child: Column(
                          children: [
                            for (var i = 0; i < 3; i++)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 24),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    for (var j = 1; j <= 3; j++)
                                      _buildNumberButton(i * 3 + j),
                                  ],
                                ),
                              ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const SizedBox(width: 70), // Spacer
                                _buildNumberButton(0),
                                SizedBox(
                                  width: 70,
                                  child: IconButton(
                                    icon: const Icon(Icons.backspace_rounded, color: Color(0xFF94A3B8)),
                                    onPressed: _onDelete,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Column(
                                children: [
                                  Text(
                                    'Role PINs: Admin: 1222 (or 2026) • Members: 1223',
                                    style: TextStyle(fontSize: 10, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    'Donations: 1224 • View Only: 1225 • Master: 1221',
                                    style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            ),
          ),
    );
  }

  Widget _buildPinCircle(int index) {
    bool isFilled = index < _currentIndex;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12),
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        color: isFilled ? Colors.white : Colors.transparent,
        border: Border.all(color: Colors.white, width: 2),
        shape: BoxShape.circle,
        boxShadow: isFilled ? [BoxShadow(color: Colors.white.withAlpha(100), blurRadius: 10)] : null,
      ),
    );
  }

  Widget _buildNumberButton(int number) {
    return InkWell(
      onTap: () => _onNumberTap(number),
      borderRadius: BorderRadius.circular(35),
      child: Container(
        width: 70,
        height: 70,
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          shape: BoxShape.circle,
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Center(
          child: Text(
            number.toString(),
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
          ),
        ),
      ),
    );
  }
}
