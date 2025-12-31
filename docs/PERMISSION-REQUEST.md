# Power Platform Permission Request - URGENT

## Issue Summary
**Error Message**: "One or more commands are unavailable due to your current privileges for this environment"

**Impact**: Cannot create Dataverse tables needed for Solar PV QA LIMS application development.

## Required Permissions

### 1. System Customizer Security Role
**Current Role**: Basic User (insufficient)
**Needed Role**: System Customizer or Environment Maker

**Required Capabilities**:
- Create and modify Dataverse tables
- Create table columns and relationships
- Create choice columns (option sets)
- Publish customizations

### 2. Environment Permissions
**Environment**: Default-fe1d95a9-4ce1-41a5-8eab-6dd43aa26d9f
**Solution**: Solar PV QA LIMS (ID: 1572e605-0fe6-f011-8406-002248d4f94a)

## Business Justification

### Project: Solar PV QA Laboratory Information Management System
- **Purpose**: Streamline quality assurance workflows for solar PV testing
- **Scope**: Service request management, test scheduling, sample tracking, results reporting
- **Users**: QA Department team members
- **Timeline**: MVP needed immediately for testing

### Technical Requirements
Need to create **3 core Dataverse tables**:
1. **Service Requests** - Track incoming test requests (internal/external/third-party)
2. **Test Samples** - Manage sample information and tracking
3. **Test Results** - Store and report test outcomes

Full schema documentation available at: [GitHub Repository](https://github.com/ganeshgowri-ASA/solar-pv-qa-lims-powerplatform)

## Immediate Action Required

### Option 1: Grant System Customizer Role (Recommended)
```
User: Gowri Ganesh (current account)
Environment: Default (Reliance Corporate IT Park Limited)
Role: System Customizer
Duration: Permanent (for ongoing development)
```

### Option 2: Create Tables on Behalf
If security policy prevents granting permissions, IT can create tables using specifications in:
- `docs/POST-LUNCH-EXECUTION.md` - Step-by-step table creation guide
- `docs/DATABASE_SCHEMA.dbml` - Complete database schema
- Database diagram: https://dbdiagram.io/d/Solar-PV-QA-LIMS-Database-Schema-6954c79939fa3db27bdca1e7

**Estimated Time**: 15 minutes to create 3 tables manually

## Contact Information
**Developer**: Gowri Ganesh
**Project Repository**: https://github.com/ganeshgowri-ASA/solar-pv-qa-lims-powerplatform
**Documentation**: All specs and guides available in /docs folder

## Alternative Workarounds Attempted
✗ Direct table creation via Power Apps maker portal - BLOCKED
✗ Table creation via Solutions > New > Table - BLOCKED  
✗ Power Automate dataflows - Would also require same permissions

**Next Steps**: Excel import method to attempt while awaiting permissions
