import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../widgets/ubs_loader.dart';

class MemberListScreen extends StatefulWidget {
  final List<Member>? initialMembers;
  final bool isShubhechhak;
  final UserRole role;
  const MemberListScreen({super.key, this.initialMembers, this.isShubhechhak = false, this.role = UserRole.admin});

  @override
  State<MemberListScreen> createState() => _MemberListScreenState();
}

class _MemberListScreenState extends State<MemberListScreen> {
  final ApiService _apiService = ApiService();
  final ScrollController _scrollController = ScrollController();
  List<Member> _allMembers = [];
  List<Member> _filteredMembers = [];
  String _lastUpdated = '';
  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  int _currentPage = 1;
  static const int _pageSize = 10;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    if (widget.initialMembers != null) {
      _allMembers = widget.initialMembers!;
      _filteredMembers = widget.initialMembers!;
      _lastUpdated = DateFormat('dd/MM/yyyy HH:mm:ss').format(DateTime.now());
      _isLoading = false;
      _hasMore = _allMembers.length >= _pageSize;
    } else {
      _fetchMembers(reset: true);
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoading && !_isLoadingMore && _hasMore) {
        _fetchMoreMembers();
      }
    }
  }

  Future<void> _fetchMembers({bool reset = true}) async {
    if (reset) {
      setState(() {
        _currentPage = 1;
        _hasMore = true;
        _isLoading = true;
      });
    }
    final query = _searchController.text.trim();
    final members = widget.isShubhechhak 
        ? await _apiService.fetchShubhechhak(page: _currentPage, pageSize: _pageSize, filter: query) 
        : await _apiService.fetchMembers(page: _currentPage, pageSize: _pageSize, filter: query);
    if (!mounted) return;
    setState(() {
      _allMembers = members;
      _filteredMembers = _allMembers;
      _hasMore = members.length >= _pageSize;
      _lastUpdated = DateFormat('dd/MM/yyyy HH:mm:ss').format(DateTime.now());
      _isLoading = false;
    });
  }

  Future<void> _fetchMoreMembers() async {
    if (_isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);
    final nextPage = _currentPage + 1;
    final query = _searchController.text.trim();
    final moreMembers = widget.isShubhechhak 
        ? await _apiService.fetchShubhechhak(page: nextPage, pageSize: _pageSize, filter: query) 
        : await _apiService.fetchMembers(page: nextPage, pageSize: _pageSize, filter: query);
    if (!mounted) return;
    setState(() {
      _currentPage = nextPage;
      _isLoadingMore = false;
      if (moreMembers.isEmpty || moreMembers.length < _pageSize) {
        _hasMore = false;
      }
      _allMembers.addAll(moreMembers);
      _filteredMembers = _allMembers;
    });
  }

  void _filterMembers(String query) {
    _fetchMembers(reset: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: _isLoading
                ? _buildLoadingState()
                : _filteredMembers.isEmpty
                    ? _buildEmptyState()
                    : _buildMemberList(),
          ),
        ],
      ),
      // Removed FAB as it was blocking edit/delete icons
    );
  }

  void _showAddMemberDialog({Member? member}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _MemberUpsertPanel(isShubhechhak: widget.isShubhechhak, member: member),
    ).then((_) => _fetchMembers());
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.isShubhechhak ? 'Shubhechhak Members' : 'Ajivan Members',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    if (_lastUpdated.isNotEmpty)
                      Text(
                        '(Last Updated: $_lastUpdated)',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontStyle: FontStyle.italic),
                      ),
                  ],
                ),
              if (widget.role == UserRole.admin)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                   IconButton(
                    icon: const Icon(Icons.person_add_alt_1_rounded, color: Color(0xFF4f46e5), size: 24),
                    onPressed: _showAddMemberDialog,
                    tooltip: widget.isShubhechhak ? 'Add New S. Member' : 'Add New A. Member',
                    visualDensity: VisualDensity.compact,
                  ),
                  IconButton(
                    icon: const Icon(Icons.picture_as_pdf_rounded, color: Colors.redAccent, size: 24),
                    onPressed: _exportToPDF,
                    tooltip: 'Export as PDF',
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _searchController,
            onChanged: _filterMembers,
            decoration: InputDecoration(
              hintText: 'Search by name, ID, or mobile...',
              prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF94A3B8)),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded),
                      onPressed: () {
                        _searchController.clear();
                        _filterMembers('');
                      },
                    )
                  : null,
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xFF4f46e5), width: 1),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return const UbsLoader(message: 'Loading Members...');
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off_rounded, size: 80, color: Colors.grey.shade200),
          const SizedBox(height: 16),
          Text(
            'No matches found',
            style: TextStyle(fontSize: 18, color: Colors.grey.shade400, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildMemberList() {
    final double width = MediaQuery.of(context).size.width;
    final int crossAxisCount = width > 900 ? 3 : (width > 500 ? 2 : 1);
    final int rowsCount = (_filteredMembers.length / crossAxisCount).ceil();
    final int totalCount = rowsCount + (_hasMore || _isLoadingMore ? 1 : 0);
    
    return RefreshIndicator(
      onRefresh: () => _fetchMembers(reset: true),
      child: ListView.builder(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(12),
        itemCount: totalCount,
        itemBuilder: (context, rowIndex) {
          if (rowIndex == rowsCount) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 16.0),
              child: Center(
                child: _isLoadingMore
                    ? const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF4F46E5)),
                          ),
                          SizedBox(width: 10),
                          Text('Loading next 10 members from server...', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                        ],
                      )
                    : TextButton.icon(
                        onPressed: _fetchMoreMembers,
                        icon: const Icon(Icons.arrow_downward_rounded, size: 16),
                        label: const Text('Load 10 more members'),
                      ),
              ),
            );
          }
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: List.generate(crossAxisCount, (colIndex) {
              final itemIndex = rowIndex * crossAxisCount + colIndex;
              if (itemIndex < _filteredMembers.length) {
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(4.0),
                    child: _buildMemberCard(_filteredMembers[itemIndex]),
                  ),
                );
              } else {
                return Expanded(child: const SizedBox.shrink());
              }
            }),
          );
        },
      ),
    );
  }

  Widget _buildMemberCard(Member member) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4f46e5).withAlpha(15),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _showMemberDetails(member),
          onLongPress: () {
            final data = '${member.name}\n${member.mobile ?? ""}\n${member.city}';
            Clipboard.setData(ClipboardData(text: data));
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Member info copied'),
                duration: const Duration(seconds: 1),
                behavior: SnackBarBehavior.floating,
                backgroundColor: const Color(0xFF4f46e5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min, // Keep column compact
              children: [
                Row(
                  children: [
                    if (member.memberId != null && member.memberId!.isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF4f46e5).withAlpha(15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          member.memberId!,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF4f46e5)),
                        ),
                      ),
                      const SizedBox(width: 10),
                    ],
                    Expanded(
                      child: Text(
                        member.name,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                    ),
                    if (member.id != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Id: ${member.id}',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey.shade600),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                // Location & Mobile
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 12, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        member.city,
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500, overflow: TextOverflow.ellipsis),
                      ),
                    ),
                    if (member.mobile != null && member.mobile!.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Icon(Icons.phone_android_rounded, size: 12, color: Colors.grey.shade400),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Flexible(
                              child: Text(
                                member.mobile!,
                                style: TextStyle(
                                  fontSize: 11, 
                                  color: member.mobileVerified == true ? const Color(0xFF1d9bf0) : Colors.grey.shade500, 
                                  fontWeight: member.mobileVerified == true ? FontWeight.bold : FontWeight.normal,
                                  overflow: TextOverflow.ellipsis
                                ),
                              ),
                            ),
                            if (member.mobileVerified == true) ...[
                              const SizedBox(width: 3),
                              const Icon(Icons.check_circle_rounded, size: 11, color: Color(0xFF1d9bf0)),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                // Badges Section - Only show if data exists
                if ((member.relation != null && member.relation!.isNotEmpty) || 
                    (member.profession != null && member.profession!.isNotEmpty) ||
                    (member.bloodGroup != null && member.bloodGroup!.isNotEmpty)) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      if (member.relation != null && member.relation!.isNotEmpty)
                        _buildBadge(member.relation!, Colors.blue.shade50, Colors.blue.shade600),
                      if (member.profession != null && member.profession!.isNotEmpty)
                        _buildBadge(member.profession!, Colors.green.shade50, Colors.green.shade600),
                      if (member.bloodGroup != null && member.bloodGroup!.isNotEmpty)
                        _buildBadge('B: ${member.bloodGroup}', Colors.red.shade50, Colors.red.shade600),
                      if (member.marriageStatus != null && member.marriageStatus!.isNotEmpty)
                        _buildBadge(member.marriageStatus!, Colors.purple.shade50, Colors.purple.shade600),
                      if (member.gender != null && member.gender!.isNotEmpty)
                        _buildBadge(member.gender!, Colors.orange.shade50, Colors.orange.shade600),
                    ],
                  ),
                ],
                const SizedBox(height: 8),
                if (member.lastUpdated != null && member.lastUpdated!.isNotEmpty)
                  Text(
                    'Updated: ${DateFormat('dd/MM/yyyy HH:mm:ss').format(DateTime.parse(member.lastUpdated!))}',
                    style: TextStyle(fontSize: 9, color: Colors.grey.shade400, fontStyle: FontStyle.italic),
                  ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (member.mobileVerified == true) ...[
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Icon(Icons.check_circle_rounded, size: 18, color: const Color(0xFF1d9bf0), shadows: [Shadow(color: Colors.black.withOpacity(0.1), blurRadius: 4)]),
                      ),
                    ],
                    _buildActionIcon(Icons.share_rounded, const Color(0xFF4f46e5), () => _shareFamily(member)),
                    if (widget.role == UserRole.admin) ...[
                      _buildActionIcon(Icons.edit_note_rounded, const Color(0xFF4f46e5), () => _showAddMemberDialog(member: member)),
                      _buildActionIcon(Icons.delete_outline_rounded, Colors.redAccent, () => _confirmDelete(member)),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }


  Widget _buildActionIcon(IconData icon, Color color, VoidCallback onPressed) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Material(
        color: color.withAlpha(15),
        borderRadius: BorderRadius.circular(6),
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(6),
          child: Padding(
            padding: const EdgeInsets.all(5),
            child: Icon(icon, color: color, size: 13),
          ),
        ),
      ),
    );
  }


  Widget _buildBadge(String text, Color bgColor, Color textColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: textColor),
      ),
    );
  }

  Future<void> _exportToPDF() async {
    setState(() => _isLoading = true);
    try {
      final Uint8List? data = widget.isShubhechhak 
          ? await _apiService.fetchShubhechhakPDF() 
          : await _apiService.fetchMemberPDF();
          
      if (data == null || data.isEmpty) {
        throw Exception('Failed to download PDF');
      }

      final directory = await getTemporaryDirectory();
      final String filename = widget.isShubhechhak ? 'shubhechhak_list.pdf' : 'member_list.pdf';
      final file = File('${directory.path}/$filename');
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

  Future<void> _shareFamily(Member member) async {
    final familyMembers = _allMembers.where((m) => m.memberId == member.memberId && m.memberId != null && m.memberId!.isNotEmpty).toList();
    if (familyMembers.isEmpty) {
      // Just share this member
      _shareSingleMember(member);
      return;
    }

    String shareText = '🏠 *Family Details (ID: ${member.memberId})*\n\n';
    for (var i = 0; i < familyMembers.length; i++) {
        final m = familyMembers[i];
        shareText += '${i+1}. *${m.name}*\n';
        if (m.relation != null) shareText += '   Role: ${m.relation}\n';
        if (m.mobile != null) shareText += '   Mob: ${m.mobile}\n';
        if (m.profession != null) shareText += '   Works: ${m.profession}\n';
        shareText += '\n';
    }
    shareText += '📍 City: ${member.city}\n';
    shareText += '🏢 Trust: UBS Seva Trust, Vadodara';

    await Share.share(shareText);
  }

  Future<void> _shareSingleMember(Member m) async {
      String shareText = '👤 *Member Details*\n\n';
      shareText += '*${m.name}*\n';
      if (m.memberId != null) shareText += 'ID: ${m.memberId}\n';
      if (m.mobile != null) shareText += 'Mob: ${m.mobile}\n';
      if (m.city.isNotEmpty) shareText += 'City: ${m.city}\n';
      shareText += '\n🏢 Trust: UBS Seva Trust, Vadodara';
      
      await Share.share(shareText);
  }

  Future<void> _confirmDelete(Member member) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Delete'),
        content: Text('Are you sure you want to delete ${member.name}?'),
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

    if (confirmed == true && member.id != null) {
      setState(() => _isLoading = true);
      final success = widget.isShubhechhak 
          ? await _apiService.deleteShubhechhak(member.id!) 
          : await _apiService.deleteMember(member.id!);
          
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Successfully deleted!'), backgroundColor: Colors.green),
          );
          _fetchMembers();
        } else {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Error deleting record'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  void _showMemberDetails(Member member) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _MemberDetailsPanel(
        member: member,
        onShare: () {
          Navigator.pop(context);
          _shareFamily(member);
        },
      ),
    );
  }
}

class _MemberUpsertPanel extends StatefulWidget {
  final bool isShubhechhak;
  final Member? member;
  const _MemberUpsertPanel({this.isShubhechhak = false, this.member});

  @override
  State<_MemberUpsertPanel> createState() => _MemberUpsertPanelState();
}

class _MemberUpsertPanelState extends State<_MemberUpsertPanel> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  
  Map<String, List<String>> _masters = {};

  final _nameController = TextEditingController();
  final _mobileController = TextEditingController();
  final _cityController = TextEditingController();
  final _professionController = TextEditingController();
  final _designationController = TextEditingController();
  final _companyController = TextEditingController();
  final _companyAddressController = TextEditingController();
  final _addressController = TextEditingController();
  final _parentMemberIdController = TextEditingController();
  final _dobController = TextEditingController();
  
  String _gender = 'Male';
  final _bloodGroupController = TextEditingController();
  final _relationController = TextEditingController();
  final _marriageStatusController = TextEditingController();
  bool _isMobileVerified = false;

  @override
  void initState() {
    super.initState();
    if (widget.member != null) {
      _nameController.text = widget.member!.name;
      _mobileController.text = widget.member!.mobile ?? '';
      _cityController.text = widget.member!.city;
      _professionController.text = widget.member!.profession ?? '';
      _designationController.text = widget.member!.designation ?? '';
      _companyController.text = widget.member!.company ?? '';
      _companyAddressController.text = widget.member!.companyAddress ?? '';
      _addressController.text = widget.member!.address ?? '';
      _parentMemberIdController.text = widget.member!.memberId ?? '';
      _dobController.text = widget.member!.dob ?? '';
      _gender = widget.member!.gender ?? 'Male';
      _bloodGroupController.text = widget.member!.bloodGroup ?? '';
      _relationController.text = widget.member!.relation ?? '';
      _marriageStatusController.text = widget.member!.marriageStatus ?? '';
      _isMobileVerified = widget.member!.mobileVerified ?? false;
    }
    _loadMasters();
  }

  @override
  void dispose() {
    _bloodGroupController.dispose();
    _relationController.dispose();
    _marriageStatusController.dispose();
    super.dispose();
  }

  Future<void> _loadMasters() async {
    final m = await _apiService.fetchMasters(isShubhechhak: widget.isShubhechhak);
    if (mounted) setState(() => _masters = m);
  }

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _dobController.text.isNotEmpty ? (DateTime.tryParse(_dobController.text) ?? DateTime.now()) : DateTime.now(),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        _dobController.text = picked.toIso8601String().split('T')[0];
      });
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);
    final data = {
      'Id': widget.member?.id,
      'Member Id': _parentMemberIdController.text,
      'Name': _nameController.text,
      'Mobile': _mobileController.text,
      'City': _cityController.text,
      'Gender': _gender,
      'Profession': _professionController.text,
      'Designation': _designationController.text,
      'Company': _companyController.text,
      'Company Address': _companyAddressController.text,
      'Blood Group': _bloodGroupController.text,
      'Relation': _relationController.text,
      'Married': _marriageStatusController.text,
      'Address': _addressController.text,
      'Date Of Birth': _dobController.text,
      'MobileVerified': _isMobileVerified,
      'Lead': widget.member?.lead,
    };

    final success = widget.isShubhechhak 
        ? await _apiService.upsertShubhechhak(data, id: widget.member?.id?.toString())
        : await _apiService.upsertMember(data, id: widget.member?.id?.toString());

    if (mounted) {
      setState(() => _isLoading = false);
      if (success) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Successfully saved!'), backgroundColor: Colors.green),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error saving data'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(2)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.member != null 
                    ? (widget.isShubhechhak ? 'Edit S. Member' : 'Edit A. Member')
                    : (widget.isShubhechhak ? 'Add New S. Member' : 'Add New A. Member'),
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ],
            ),
          ),
          const Divider(),
          Expanded(
            child: Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  _buildTextField('Full Name*', _nameController, Icons.person, required: true),
                  const SizedBox(height: 16),
                  _buildTextField('Mobile*', _mobileController, Icons.phone_android, required: true),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: _buildAutocomplete('Relation', _masters['relation'] ?? [], _relationController, Icons.people)),
                      const SizedBox(width: 16),
                      Expanded(child: _buildTextField('Parent Member ID', _parentMemberIdController, Icons.tag)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: _buildDropdown('Gender', ['Male', 'Female'], _gender, (v) => setState(() => _gender = v!))),
                      const SizedBox(width: 16),
                      Expanded(child: InkWell(onTap: _selectDate, child: IgnorePointer(child: _buildTextField('Date of Birth', _dobController, Icons.cake)))),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: _buildAutocomplete('Marriage Status', _masters['marriageStatus'] ?? [], _marriageStatusController, Icons.favorite)),
                      const SizedBox(width: 16),
                       Expanded(child: _buildAutocomplete('City', _masters['city'] ?? [], _cityController, Icons.location_on)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildTextField('Profession', _professionController, Icons.work),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: _buildTextField('Designation', _designationController, Icons.badge)),
                      const SizedBox(width: 16),
                      Expanded(child: _buildAutocomplete('Blood Group', _masters['bloodGroup'] ?? [], _bloodGroupController, Icons.bloodtype)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildTextField('Company', _companyController, Icons.business),
                  const SizedBox(height: 16),
                  _buildTextField('Company Address', _companyAddressController, Icons.business_center, maxLines: 2),
                  const SizedBox(height: 16),
                  _buildTextField('Address', _addressController, Icons.home, maxLines: 2),
                  const SizedBox(height: 16),
                  CheckboxListTile(
                    title: const Text('Mobile Number Verified', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                    subtitle: const Text('Check this if you have manually verified this mobile number', style: TextStyle(fontSize: 11)),
                    value: _isMobileVerified,
                    onChanged: (val) => setState(() => _isMobileVerified = val ?? false),
                    activeColor: const Color(0xFF4f46e5),
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    visualDensity: VisualDensity.compact,
                  ),
                  const SizedBox(height: 40),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _save,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF4f46e5),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _isLoading 
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Save Information', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, IconData icon, {bool required = false, int maxLines = 1, bool readOnly = false, VoidCallback? onTap}) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      readOnly: readOnly,
      onTap: onTap,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: Colors.grey),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.grey.shade50,
      ),
      validator: required ? (v) => (v == null || v.isEmpty) ? 'Required' : null : null,
    );
  }

   Widget _buildDropdown(String label, List<String> items, String? value, Function(String?) onChanged) {
    // Ensure value is in the items or add it if not empty
    final dropdownItems = items.toSet().toList(); // Unique items
    
    // Add default values for common dropdowns if they are empty
    if (dropdownItems.isEmpty) {
      if (label == 'Marriage Status') {
        dropdownItems.addAll(['Married', 'Unmarried', 'Widow', 'Widower', 'Divorced']);
      } else if (label == 'Gender') {
        dropdownItems.addAll(['Male', 'Female']);
      } else if (label == 'Blood Group') {
        dropdownItems.addAll(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']);
      }
    }

    if (value != null && value.isNotEmpty && !dropdownItems.contains(value)) {
      dropdownItems.insert(0, value);
    }
    
    return DropdownButtonFormField<String>(
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.grey.shade50,
      ),
      initialValue: (value != null && value.isNotEmpty) ? value : null,
      items: dropdownItems.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
      onChanged: onChanged,
    );
  }

  Widget _buildAutocomplete(String label, List<String> options, TextEditingController controller, IconData icon) {
    return LayoutBuilder(
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
          if (textController.text != controller.text && controller.text.isNotEmpty && textController.text.isEmpty) {
            textController.text = controller.text;
          }
          textController.addListener(() {
            controller.text = textController.text;
          });

          return TextFormField(
            controller: textController,
            focusNode: focusNode,
            decoration: InputDecoration(
              labelText: label,
              prefixIcon: Icon(icon, color: Colors.grey),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              filled: true,
              fillColor: Colors.grey.shade50,
            ),
            onFieldSubmitted: (value) {
              onFieldSubmitted();
            },
          );
        },
        optionsViewBuilder: (context, onSelected, options) {
          return Align(
            alignment: Alignment.topLeft,
            child: Material(
              elevation: 4.0,
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
    );
  }
}

class _MemberDetailsPanel extends StatelessWidget {
  final Member member;
  final VoidCallback? onShare;
  const _MemberDetailsPanel({required this.member, this.onShare});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
      ),
      child: Column(
        children: [
          _buildHandle(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                _buildHeader(context),
                const SizedBox(height: 32),
                _buildInfoSection('Personal Information', [
                  _buildInfoTile(context, 'Member ID', member.memberId ?? 'N/A', Icons.tag_rounded),
                  _buildInfoTile(context, 'Date of Birth', member.dob ?? 'N/A', Icons.cake_rounded),
                  _buildInfoTile(context, 'Gender', member.gender ?? 'N/A', Icons.person_rounded),
                  _buildInfoTile(context, 'Marital Status', member.marriageStatus ?? 'N/A', Icons.favorite_rounded),
                  _buildInfoTile(context, 'Blood Group', member.bloodGroup ?? 'N/A', Icons.water_drop_rounded),
                ]),
                const SizedBox(height: 24),
                _buildInfoSection('Contact & Location', [
                  _buildInfoTile(
                    context, 
                    'Mobile', 
                    member.mobile ?? 'N/A', 
                    Icons.phone_android_rounded,
                    trailing: member.mobileVerified == true 
                      ? const Icon(Icons.verified_rounded, color: Color(0xFF4f46e5), size: 16)
                      : null
                  ),
                  _buildInfoTile(context, 'City', member.city, Icons.location_on_rounded),
                  _buildInfoTile(context, 'Address', member.address ?? 'N/A', Icons.home_rounded),
                  _buildInfoTile(context, 'Relation', member.relation ?? 'N/A', Icons.people_rounded),
                ]),
                const SizedBox(height: 24),
                _buildInfoSection('Professional & Others', [
                  _buildInfoTile(context, 'Profession', member.profession ?? 'N/A', Icons.work_rounded),
                  _buildInfoTile(context, 'Designation', member.designation ?? 'N/A', Icons.badge_rounded),
                  _buildInfoTile(context, 'Company', member.company ?? 'N/A', Icons.business_rounded),
                  _buildInfoTile(context, 'Company Address', member.companyAddress ?? 'N/A', Icons.business_center_rounded),
                  _buildInfoTile(context, 'Lead Member', member.lead?.toString() ?? 'N/A', Icons.star_rounded),
                  if (member.lastUpdated != null && member.lastUpdated!.isNotEmpty)
                  _buildInfoTile(context, 'Last Updated', DateFormat('dd/MM/yyyy HH:mm:ss').format(DateTime.parse(member.lastUpdated!)), Icons.update_rounded),
                ]),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHandle() {
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 12),
        width: 40,
        height: 4,
        decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(2)),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return InkWell(
      onLongPress: () {
        final summary = '''
Member: ${member.name}
ID: ${member.memberId ?? 'N/A'}
DOB: ${member.dob ?? 'N/A'}
Mobile: ${member.mobile ?? 'N/A'}
City: ${member.city}
Profession: ${member.profession ?? 'N/A'}
Relation: ${member.relation ?? 'N/A'}
''';
        Clipboard.setData(ClipboardData(text: summary));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Full member summary copied to clipboard'),
            duration: Duration(seconds: 1),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Color(0xFF4f46e5),
          ),
        );
      },
      borderRadius: BorderRadius.circular(24),
      child: Row(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF4f46e5), Color(0xFF8b5cf6)]),
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Center(
              child: Icon(Icons.person, color: Colors.white, size: 40),
            ),
          ),
          const SizedBox(width: 20),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Flexible(
                    child: Text(
                      member.name,
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (onShare != null)
                  IconButton(
                    icon: const Icon(Icons.share_rounded, color: Color(0xFF4f46e5), size: 22),
                    onPressed: onShare,
                    tooltip: 'Share Family Details',
                    constraints: const BoxConstraints(),
                    padding: const EdgeInsets.all(4),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                member.profession ?? 'Member',
                style: TextStyle(fontSize: 16, color: Colors.indigo.shade400, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

  Widget _buildInfoSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 1)),
        const SizedBox(height: 16),
        ...children,
      ],
    );
  }

  Widget _buildInfoTile(BuildContext context, String label, String value, IconData icon, {Widget? trailing}) {
    return InkWell(
      onLongPress: () {
        if (value != 'N/A') {
          Clipboard.setData(ClipboardData(text: value));
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Copied $label to clipboard'),
              duration: const Duration(seconds: 1),
              behavior: SnackBarBehavior.floating,
              backgroundColor: const Color(0xFF4f46e5),
            ),
          );
        }
      },
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, size: 18, color: const Color(0xFF64748B)),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade400, fontWeight: FontWeight.w500)),
                  Text(
                    value, 
                    style: TextStyle(
                      fontSize: 15, 
                      color: (label == 'Mobile' && value != 'N/A' && member.mobileVerified == true) ? const Color(0xFF1d9bf0) : const Color(0xFF1E293B), 
                      fontWeight: (label == 'Mobile' && value != 'N/A' && member.mobileVerified == true) ? FontWeight.bold : FontWeight.w600
                    )
                  ),
                ],
              ),
            ),
            if (trailing != null) ...[
              const Icon(Icons.check_circle_rounded, color: Color(0xFF1d9bf0), size: 16),
              const SizedBox(width: 8),
            ],
            const Icon(Icons.copy_rounded, size: 14, color: Color(0xFFE2E8F0)),
          ],
        ),
      ),
    );
  }
}
