import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../widgets/ubs_loader.dart';

class ReportsScreen extends StatefulWidget {
  final UserRole? role;
  const ReportsScreen({super.key, this.role});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

enum AgeCategory { below, above }
enum GenderFilter { all, male, female }

class _ReportsScreenState extends State<ReportsScreen> {
  final ApiService _apiService = ApiService();
  
  List<Member> _allMembers = [];
  bool _isLoading = true;
  String _generatedTime = '';
  bool _isOnline = true;
  int _ageLimit = 40;
  
   AgeCategory _activeAgeCategory = AgeCategory.below;
  GenderFilter _selectedGender = GenderFilter.all;

  void _copyToClipboard(String label, String? value) {
    if (value == null || value.isEmpty || value == '-') return;
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
    _loadData();
    // Simple check for web connectivity if running on web
    _checkConnectivity();
  }

  void _checkConnectivity() {
    // This is a simple way for web, for mobile usually use connectivity_plus
    try {
      setState(() => _isOnline = true); // Default
    } catch (_) {}
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _isOnline = true; // Assume online for next try
    });
    try {
      final members = await _apiService.fetchMembers();
      if (mounted) {
        setState(() {
            _allMembers = members.where((m) => 
              m.name.isNotEmpty && 
              (m.mobile != null && m.mobile!.isNotEmpty) && 
              (m.dob != null && m.dob!.isNotEmpty)
            ).toList();
            _generatedTime = DateFormat('dd/MM/yyyy HH:mm:ss').format(DateTime.now());
            _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isOnline = false; // Set offline status on error
        });
      }
    }
  }

  int _calculateAge(String? dob) {
    if (dob == null || dob.isEmpty) return 0;
    try {
      final dateStr = dob.contains('T') ? dob.split('T')[0] : dob;
      final birthDate = DateTime.tryParse(dateStr);
      if (birthDate == null) return 0;
      
      final today = DateTime.now();
      int age = today.year - birthDate.year;
      if (today.month < birthDate.month || (today.month == birthDate.month && today.day < birthDate.day)) {
        age--;
      }
      return age;
    } catch (e) {
      return 0;
    }
  }

  List<Member> get _filteredMembers {
    return _allMembers.where((m) {
      final age = _calculateAge(m.dob);
      final gender = (m.gender ?? '').toLowerCase();
      
      // Age Filter
      final matchesAge = _activeAgeCategory == AgeCategory.below ? age < _ageLimit : age >= _ageLimit;
      if (!matchesAge) return false;
      
      // Gender Filter
      if (_selectedGender != GenderFilter.all) {
        final targetGenderStr = _selectedGender == GenderFilter.male ? 'male' : 'female';
        if (gender != targetGenderStr) return false;
      }
      
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Column(
        children: [
          _buildHeader(),
          if (!_isOnline) _buildOfflineBanner(),
          _buildFilterPanel(),
          Expanded(
            child: _isLoading 
                ? const UbsLoader(message: 'Compiling Reports...')
                : _buildResultsList(),
          ),
        ],
      ),
    );
  }

  Widget _buildOfflineBanner() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.shade100),
      ),
      child: Row(
        children: [
          Icon(Icons.wifi_off_rounded, color: Colors.red.shade700, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'No Internet Connection',
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red.shade900, fontSize: 13),
                ),
                Text(
                  'Refresh failed. Showing previous or empty data.',
                  style: TextStyle(color: Colors.red.shade700, fontSize: 11),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: _loadData,
            style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
            child: Text('Retry', style: TextStyle(color: Colors.red.shade900, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return const Padding(
      padding: EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        children: [
          Icon(Icons.bar_chart_rounded, color: Color(0xFF4f46e5)),
          SizedBox(width: 12),
          Text(
            'Members Analysis',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterPanel() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withAlpha(5), blurRadius: 5, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Age limit slider + label in one row
          Row(
            children: [
              Text('AGE: $_ageLimit', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF4f46e5))),
              Expanded(
                child: SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    trackHeight: 2,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                    overlayShape: const RoundSliderOverlayShape(overlayRadius: 14),
                  ),
                  child: Slider(
                    value: _ageLimit.toDouble(),
                    min: 10,
                    max: 90,
                    divisions: 16,
                    activeColor: const Color(0xFF4f46e5),
                    onChanged: (v) => setState(() => _ageLimit = v.round()),
                  ),
                ),
              ),
            ],
          ),
          // Age Categories + Gender in one row to save space if wide, or compact column
          Row(
            children: [
              Expanded(
                flex: 2,
                child: Container(
                  height: 32,
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Expanded(child: _buildCompactTab('Below', _activeAgeCategory == AgeCategory.below, () => setState(() => _activeAgeCategory = AgeCategory.below))),
                      Expanded(child: _buildCompactTab('Above', _activeAgeCategory == AgeCategory.above, () => setState(() => _activeAgeCategory = AgeCategory.above))),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 3,
                child: SizedBox(
                  height: 32,
                  child: SegmentedButton<GenderFilter>(
                    segments: const [
                      ButtonSegment(value: GenderFilter.all, label: Text('All', style: TextStyle(fontSize: 10))),
                      ButtonSegment(value: GenderFilter.male, label: Text('M', style: TextStyle(fontSize: 10))),
                      ButtonSegment(value: GenderFilter.female, label: Text('F', style: TextStyle(fontSize: 10))),
                    ],
                    selected: {_selectedGender},
                    onSelectionChanged: (set) => setState(() => _selectedGender = set.first),
                    showSelectedIcon: false,
                    style: SegmentedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCompactTab(String label, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
          boxShadow: isSelected ? [BoxShadow(color: Colors.black.withAlpha(5), blurRadius: 2)] : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? const Color(0xFF4f46e5) : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }


  Widget _buildResultsList() {
    final members = _filteredMembers;
    
    if (members.isEmpty) {
      return const Center(child: Text('No members match your criteria.'));
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${members.length} Members Found', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                  Text('Generated on: $_generatedTime', style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                ],
              ),
               Row(
                children: [
                  if (widget.role != UserRole.viewMembers && widget.role != UserRole.onlyView)
                    ElevatedButton.icon(
                      onPressed: () {
                        // Placeholder for PDF logic or Print
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Generating PDF Report...'), duration: Duration(seconds: 1)),
                        );
                      },
                      icon: const Icon(Icons.picture_as_pdf_rounded, size: 18),
                      label: const Text('Export PDF', style: TextStyle(fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.redAccent,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 24),
            scrollDirection: Axis.horizontal,
            child: SingleChildScrollView(
              child: DataTable(
                headingRowColor: WidgetStateProperty.all(const Color(0xFFF1F5F9)),
                columnSpacing: 16,
                columns: const [
                  DataColumn(label: SizedBox(width: 80, child: Text('ID'))),
                  DataColumn(label: SizedBox(width: 200, child: Text('Name'))),
                  DataColumn(label: SizedBox(width: 60, child: Text('Age'))),
                  DataColumn(label: SizedBox(width: 60, child: Center(child: Text('Gender')))),
                  DataColumn(label: SizedBox(width: 150, child: Text('Mobile'))),
                ],
                rows: members.map((m) {
                  final age = _calculateAge(m.dob).toString();
                  return DataRow(cells: [
                     DataCell(
                      GestureDetector(
                        onLongPress: () => _copyToClipboard('Member ID', m.memberId),
                        child: SizedBox(width: 80, child: Text(m.memberId ?? '-', style: const TextStyle(fontSize: 12)))
                      )
                    ),
                    DataCell(
                      GestureDetector(
                        onLongPress: () => _copyToClipboard('Name', m.name),
                        child: SizedBox(width: 200, child: Text(m.name, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis))
                      )
                    ),
                    DataCell(
                      GestureDetector(
                        onLongPress: () => _copyToClipboard('Age', age),
                        child: SizedBox(width: 60, child: Text(age, style: const TextStyle(fontSize: 12)))
                      )
                    ),
                    DataCell(SizedBox(width: 60, child: Center(
                      child: Icon(
                        (m.gender ?? '').toLowerCase() == 'male' ? Icons.male : Icons.female,
                        size: 16,
                        color: (m.gender ?? '').toLowerCase() == 'male' ? Colors.blue : Colors.pink,
                      ),
                    ))),
                    DataCell(
                      GestureDetector(
                        onLongPress: () => _copyToClipboard('Mobile', m.mobile),
                        child: SizedBox(width: 150, child: Text(m.mobile ?? '-', style: const TextStyle(fontSize: 12)))
                      )
                    ),
                  ]);
                }).toList(),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
