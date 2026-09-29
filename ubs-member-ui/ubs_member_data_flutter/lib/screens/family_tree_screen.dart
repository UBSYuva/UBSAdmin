import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class FamilyTreeScreen extends StatefulWidget {
  const FamilyTreeScreen({super.key});

  @override
  State<FamilyTreeScreen> createState() => _FamilyTreeScreenState();
}

class _FamilyTreeScreenState extends State<FamilyTreeScreen> {
  final ApiService _apiService = ApiService();
  List<Member> _allMembers = [];
  bool _isLoading = true;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchMembers();
  }

  Future<void> _fetchMembers() async {
    final members = await _apiService.fetchMembers();
    if (mounted) {
      setState(() {
        _allMembers = members;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF8FAFC),
      child: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _allMembers.isEmpty
                    ? const Center(child: Text('No members found.'))
                    : _buildForest(),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(5),
            offset: const Offset(0, 2),
            blurRadius: 10,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Family Tree',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded, color: Color(0xFF4f46e5)),
                onPressed: () {
                   setState(() => _isLoading = true);
                   _fetchMembers();
                },
                tooltip: 'Refresh Data',
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _searchController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              hintText: 'Search by Member ID...',
              prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF94A3B8)),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            onChanged: (v) => setState(() => _searchQuery = v),
          ),
        ],
      ),
    );
  }

  Widget _buildForest() {
    final trees = _buildTrees(_allMembers);
    final filteredTrees = trees.where((root) => _treeContains(root, _searchQuery.toLowerCase())).toList();

    if (filteredTrees.isEmpty) return const Center(child: Text('No trees match your search.'));

    return InteractiveViewer(
      constrained: false,
      boundaryMargin: const EdgeInsets.all(100),
      minScale: 0.05,
      maxScale: 2.0,
      child: Column(
        children: filteredTrees.map((tree) => Padding(
          padding: const EdgeInsets.all(50.0),
          child: _buildTreeNode(tree),
        )).toList(),
      ),
    );
  }

  bool _treeContains(CoupleNode node, String query) {
    if (query.isEmpty) return true;
    if ((node.husband?.memberId ?? '').toLowerCase().contains(query)) return true;
    if ((node.wife?.memberId ?? '').toLowerCase().contains(query)) return true;
    return node.children.any((child) => _treeContains(child, query));
  }

  List<CoupleNode> _buildTrees(List<Member> members) {
    // 1. Group by MemberId (Family Groups)
    final Map<String, List<Member>> families = {};
    for (var m in members) {
      if (m.memberId == null || m.memberId!.isEmpty) continue;
      families.putIfAbsent(m.memberId!, () => []).add(m);
    }

    // 2. Create nodes for all "Lead" Couples (Self + Wife)
    final Map<String, CoupleNode> familyNodes = {};
    for (var familyId in families.keys) {
      final members = families[familyId]!;
      final selfInFamily = members.where((m) => m.relation?.toLowerCase() == 'self').firstOrNull;
      final wifeInFamily = members.where((m) => m.relation?.toLowerCase() == 'wife').firstOrNull;

      if (selfInFamily != null) {
        familyNodes[familyId] = CoupleNode(
          familyId: familyId,
          husband: selfInFamily,
          wife: wifeInFamily,
        );
      }
    }

    // 3. Process children within each family group (Level 1 and Level 2)
    for (var familyId in families.keys) {
      final rootNode = familyNodes[familyId];
      if (rootNode == null) continue;

      final members = families[familyId]!;
      
      // Identify Level 1 (Children of Self): Son, Daughter
      // Also Son-in-law/Daughter-in-law if they are listed in the same family group
      final sons = members.where((m) => m.relation?.toLowerCase() == 'son').toList();
      final daughters = members.where((m) => m.relation?.toLowerCase() == 'daughter').toList();
      
      final Map<String, CoupleNode> childNodesMap = {}; // Map of individual children

      for (var son in sons) {
        // Find if he has a wife (Daughter-in-law) in the same group
        // Usually, if they are in the same memberId, there might only be one?
        // Let's look for any Daughter-in-law
        final dInLaw = members.where((m) => m.relation?.toLowerCase() == 'daughter-in-law' || m.relation?.toLowerCase() == 'daughter in law').firstOrNull;
        final node = CoupleNode(familyId: familyId, husband: son, wife: dInLaw);
        rootNode.children.add(node);
        childNodesMap[son.id.toString()] = node;
      }

      for (var daughter in daughters) {
        // Find if she has a husband (Son-in-law)
        final sInLaw = members.where((m) => m.relation?.toLowerCase() == 'son-in-law' || m.relation?.toLowerCase() == 'son in law').firstOrNull;
        final node = CoupleNode(familyId: familyId, husband: daughter, wife: sInLaw);
        rootNode.children.add(node);
        childNodesMap[daughter.id.toString()] = node;
      }

      // Identify Level 2 (Grandchildren of Self / Children of Son/Daughter)
      final grandChildren = members.where((m) => m.relation?.toLowerCase().contains('grand') ?? false).toList();
      for (var gc in grandChildren) {
        final pId = gc.parentId;
        if (pId != null && childNodesMap.containsKey(pId)) {
          childNodesMap[pId]!.children.add(CoupleNode(familyId: familyId, husband: gc));
        } else {
          // If no specific parentId found among children, attach directly to root as "Grandchild"
          rootNode.children.add(CoupleNode(familyId: familyId, husband: gc));
        }
      }
    }

    // 4. Link married children who have their own familyId
    for (var familyId in familyNodes.keys) {
      final node = familyNodes[familyId]!;
      final pId = node.husband?.parentId;
      if (pId != null && pId != '0' && pId.isNotEmpty) {
        // Find which familyId this points to
        final parentFamily = familyNodes[pId];
        if (parentFamily != null && parentFamily != node) {
          if (!parentFamily.children.contains(node)) {
            parentFamily.children.add(node);
          }
        }
      }
    }

    // 5. Final Root Selection: Nodes that represent the "Self" (Level 0) and are not children of another family
    final Set<String> childFamilyIds = {};
    for (var node in familyNodes.values) {
      for (var child in node.children) {
        if (child.familyId != node.familyId) {
          childFamilyIds.add(child.familyId);
        }
      }
    }

    return familyNodes.values.where((node) => !childFamilyIds.contains(node.familyId)).toList();
  }

  Widget _buildTreeNode(CoupleNode node) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CustomPaint(
          painter: TreeLinePainter(
            hasChildren: node.children.isNotEmpty,
            hasWife: node.wife != null,
          ),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 40),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (node.husband != null) _buildMemberBox(node.husband!),
                if (node.husband != null && node.wife != null) const SizedBox(width: 40),
                if (node.wife != null) _buildMemberBox(node.wife!),
              ],
            ),
          ),
        ),
        
        if (node.children.isNotEmpty)
          IntrinsicWidth(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: node.children.asMap().entries.map((entry) {
                final index = entry.key;
                final child = entry.value;
                return CustomPaint(
                  painter: BranchPainter(
                    isFirst: index == 0,
                    isLast: index == node.children.length - 1,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _buildTreeNode(child),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }

  Widget _buildMemberBox(Member member) {
    return Container(
      width: 150,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.black, width: 2),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text((member.relation ?? 'MEMBER').toUpperCase(), 
            style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 1, color: Colors.blueAccent)),
          const SizedBox(height: 6),
          Text(member.name, 
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.black)),
          const SizedBox(height: 4),
          Text('ID: ${member.memberId}', 
            style: const TextStyle(fontSize: 8, color: Colors.black54, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class CoupleNode {
  final String familyId;
  final Member? husband;
  final Member? wife;
  final List<CoupleNode> children = [];

  CoupleNode({required this.familyId, this.husband, this.wife});
}

class TreeLinePainter extends CustomPainter {
  final bool hasChildren;
  final bool hasWife;

  TreeLinePainter({required this.hasChildren, required this.hasWife});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    const husbandWidth = 150.0;
    const gap = 40.0;
    
    if (hasWife) {
      // Line connecting husband and wife
      canvas.drawLine(
        Offset(husbandWidth, 40),
        Offset(husbandWidth + gap, 40),
        paint,
      );

      if (hasChildren) {
        // Line down from union
        canvas.drawLine(
          Offset(husbandWidth + (gap / 2), 40),
          Offset(husbandWidth + (gap / 2), size.height),
          paint,
        );
      }
    } else if (hasChildren) {
      // Single parent, line down from center
      canvas.drawLine(
        Offset(husbandWidth / 2, 70),
        Offset(husbandWidth / 2, size.height),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class BranchPainter extends CustomPainter {
  final bool isFirst;
  final bool isLast;

  BranchPainter({required this.isFirst, required this.isLast});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final centerX = size.width / 2;

    if (!isFirst) {
      canvas.drawLine(Offset(0, 0), Offset(centerX, 0), paint);
    }
    if (!isLast) {
      canvas.drawLine(Offset(centerX, 0), Offset(size.width, 0), paint);
    }

    canvas.drawLine(Offset(centerX, 0), Offset(centerX, 20), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
