import 'package:flutter/material.dart';
import 'invoice_generator_screen.dart';
import 'member_list_screen.dart';
import 'donation_summary_screen.dart';
import 'reports_screen.dart';
import 'login_screen.dart';

import '../models/models.dart';

class MainScreen extends StatefulWidget {
  final UserRole? role;
  const MainScreen({super.key, this.role = UserRole.admin});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;

  List<Widget> _getAvailableScreens() {
    final curRole = widget.role ?? UserRole.admin;
    if (curRole == UserRole.viewMembers || curRole == UserRole.onlyView) {
      return [
        MemberListScreen(key: const ValueKey('members'), role: curRole),
        MemberListScreen(key: const ValueKey('shubhechhak'), isShubhechhak: true, role: curRole),
        ReportsScreen(role: curRole),
      ];
    } else if (curRole == UserRole.donationInvoice) {
      return [
        const InvoiceGeneratorScreen(),
        const DonationSummaryScreen(),
      ];
    }
    // Admin access
    return [
      MemberListScreen(key: const ValueKey('members'), role: curRole),
      MemberListScreen(key: const ValueKey('shubhechhak'), isShubhechhak: true, role: curRole),
      const InvoiceGeneratorScreen(),
      const DonationSummaryScreen(),
      const ReportsScreen(),
    ];
  }

  List<BottomNavigationBarItem> _getAvailableItems() {
    final curRole = widget.role ?? UserRole.admin;
    if (curRole == UserRole.viewMembers || curRole == UserRole.onlyView) {
      return const [
        BottomNavigationBarItem(
          icon: Icon(Icons.people_alt_outlined),
          activeIcon: Icon(Icons.people_alt_rounded),
          label: 'A. Members',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.favorite_border_rounded),
          activeIcon: Icon(Icons.favorite_rounded),
          label: 'S. Members',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.bar_chart_rounded),
          activeIcon: Icon(Icons.bar_chart_rounded),
          label: 'Reports',
        ),
      ];
    } else if (curRole == UserRole.donationInvoice) {
      return const [
        BottomNavigationBarItem(
          icon: Icon(Icons.description_outlined),
          activeIcon: Icon(Icons.description_rounded),
          label: 'Invoice',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.payments_outlined),
          activeIcon: Icon(Icons.payments_rounded),
          label: 'Donations',
        ),
      ];
    }
    return const [
      BottomNavigationBarItem(
        icon: Icon(Icons.people_alt_outlined),
        activeIcon: Icon(Icons.people_alt_rounded),
        label: 'A. Members',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.favorite_border_rounded),
        activeIcon: Icon(Icons.favorite_rounded),
        label: 'S. Members',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.description_outlined),
        activeIcon: Icon(Icons.description_rounded),
        label: 'Invoice',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.payments_outlined),
        activeIcon: Icon(Icons.payments_rounded),
        label: 'Donations',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.bar_chart_rounded),
        activeIcon: Icon(Icons.bar_chart_rounded),
        label: 'Reports',
      ),
    ];
  }


  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(5),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: ClipOval(
                      child: Image.asset('assets/logo.png', width: 40, height: 40, fit: BoxFit.cover),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'UBS Seva Trust, Vadodara',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E293B)),
                        ),
                        Text(
                          'Admin Panel',
                          style: TextStyle(fontSize: 10, color: Colors.indigo.shade400, fontWeight: FontWeight.w600, letterSpacing: 0.5),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.logout_rounded, color: Colors.redAccent),
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Logout'),
                          content: const Text('Are you sure you want to logout?'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text('Cancel'),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.of(context).pop();
                                Navigator.of(context).pushReplacement(
                                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                                );
                              },
                              child: const Text('Logout', style: TextStyle(color: Colors.redAccent)),
                            ),
                          ],
                        ),
                      );
                    },
                    tooltip: 'Logout',
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 400),
        switchInCurve: Curves.easeInOut,
        switchOutCurve: Curves.easeInOut,
        child: _getAvailableScreens()[_selectedIndex],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(15),
              blurRadius: 30,
              offset: const Offset(0, -10),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: BottomNavigationBar(
              type: BottomNavigationBarType.fixed,
              backgroundColor: Colors.transparent,
              elevation: 0,
              currentIndex: _selectedIndex,
              onTap: _onItemTapped,
              selectedItemColor: const Color(0xFF4f46e5),
              unselectedItemColor: const Color(0xFF94A3B8),
              selectedIconTheme: const IconThemeData(size: 28),
              unselectedIconTheme: const IconThemeData(size: 24),
              selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
              unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 10),
              items: _getAvailableItems(),
            ),
          ),
        ),
      ),
    );
  }
}
