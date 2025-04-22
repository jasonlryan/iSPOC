# Functional Specification for SPoC System

## 1. iSPOC (Internal SPoC)

**Purpose**: iSPOC is designed to support MHA staff with centralized access to internal resources, IT support, policy information, and operational guidance, enabling faster, more consistent responses and reducing the time staff spends on common queries.

### Key Functional Components of iSPOC

#### Centralized Query Resolution and Information Access

- **Knowledge Base Access**: Provides access to a searchable knowledge base that includes common procedures, HR policies, care guidelines, and troubleshooting steps for IT issues.
- **FAQs and Common Issues**: AI-based system detects frequently asked questions and automatically updates the FAQ section, refining responses over time.
- **Instant Responses with AI Chatbot**: iSPOC chatbot instantly addresses queries from staff, delivering real-time support.

#### IT Helpdesk Support

- **First-Line IT Issue Resolution**: Automates responses to frequent technical issues (e.g., password resets, access to applications, network issues).
- **Automated Ticketing and Escalation**: For issues requiring specialized support, iSPOC generates a ticket and escalates it to the appropriate IT team, tracking response and resolution times.

#### Policy Access and Interpretation

- **Plain Language Policy Summaries**: Converts complex policy language into plain language for easier understanding by staff, improving policy compliance and clarity.
- **24/7 Policy Access**: Provides 24/7 access to policy information, allowing staff to retrieve policy details anytime.
- **Automated Compliance Alerts**: Flags and alerts staff to any compliance deviations related to policies (e.g., GDPR, health and safety regulations).

#### Internal Inquiry Management

- **Task Routing and Assignment**: Routes inquiries to appropriate departments or personnel when the AI cannot resolve them, ensuring timely handling of complex cases.
- **Tracking and Follow-up**: iSPOC tracks inquiries and automatically follows up with assigned personnel, providing status updates to the requester.

#### Training and Development Support

- **Staff Training Recommendations**: Based on frequent inquiries, iSPOC suggests specific training materials or sessions that address identified knowledge gaps.
- **Self-Service Training Modules**: Links staff to training modules relevant to their queries (e.g., using MHA systems, health and safety procedures).

#### Analytics and Insights

- **Usage Tracking and Reporting**: Tracks common queries, response times, and user satisfaction ratings, providing data for continuous improvement.
- **Trend Analysis for Resource Allocation**: Highlights trends in inquiries, helping management allocate resources more effectively (e.g., identifying training needs or IT support staffing).

## 2. eSPOC (External SPoC)

**Purpose**: eSPOC is designed to support MHA residents, their families, and external partners by providing centralized, automated assistance with routine queries, care updates, and contact with the care team, enhancing engagement and transparency.

### Key Functional Components of eSPOC

#### Resident and Family Inquiry Support

- **General Inquiry Handling**: AI-powered chatbot responds to common resident and family questions (e.g., visiting hours, resident schedules, upcoming events) in real-time.
- **Resident Health and Care Updates**: Provides families with access to real-time updates on their loved one’s care, as permitted, and alerts families about significant events (e.g., changes in health status, care plan updates).
- **External FAQ and Knowledge Base**: eSPOC provides an accessible knowledge base for families, containing information about MHA’s services, locations, and policies relevant to resident care.

#### Personalized Family Communication

- **Regular Updates on Resident Well-being**: eSPOC can send scheduled updates to family members, providing them with a summary of care activities, well-being reports, and social participation.
- **Event Reminders and Notifications**: Sends notifications to families about upcoming events, special activities, and other community engagements, fostering involvement and communication.

#### Automated Ticketing and Escalation

- **Family Support Ticketing**: For complex inquiries or complaints, eSPOC automatically generates a support ticket, routing it to the appropriate staff member or team for follow-up.
- **Escalation Protocols**: Escalates unresolved or urgent inquiries to senior management or specialized departments, ensuring timely response.

#### Emergency Support and Notifications

- **Real-Time Alerts for Critical Incidents**: eSPOC notifies family members in real-time for incidents such as falls, medical emergencies, or behavioral incidents, as well as the steps taken by staff in response.
- **Direct Line for Immediate Concerns**: eSPOC provides a direct line of contact for urgent family inquiries, ensuring families can reach MHA staff promptly when necessary.

#### Resident Companion and Engagement

- **AI-Driven Conversational Companion**: For residents, eSPOC offers a conversational AI companion that can provide reminders, engage residents in activities, or simply offer conversational support, reducing feelings of isolation.
- **Activity and Social Engagement Tracking**: Tracks resident participation in social activities and engagement, reporting these details to families and care staff, and encouraging tailored activity recommendations.

#### Support for Non-Verbal Residents

- **Alternative Communication Tools**: eSPOC includes tools that help non-verbal residents communicate needs or emotions through gestures or pre-set indicators, allowing more personalized and responsive care.

#### Data Collection and Continuous Improvement

- **Feedback Mechanism**: eSPOC gathers feedback from residents and family members, tracking satisfaction and areas for improvement.
- **Data-Driven Insights**: Identifies patterns in family and resident inquiries, providing management with insights into frequently asked questions, potential areas of concern, and opportunities for communication improvement.

## System Requirements for Spoc (iSPOC and eSPOC)

- **Data Security and Privacy**: Both iSPOC and eSPOC must comply with GDPR and other relevant data protection regulations, ensuring that all sensitive resident and staff information is protected.
- **User Authentication and Access Control**: Ensures that only authorized personnel and family members can access certain types of information, such as resident health updates.
- **Integration with MHA’s Systems**: Spoc integrates seamlessly with existing systems (e.g., EHRs, IT support systems, policy databases) for data consistency and streamlined access.
- **Mobile and Web Accessibility**: Accessible through mobile apps and web portals, providing flexibility for staff and families to access support from anywhere.
- **Performance Monitoring and Analytics**: Includes a dashboard for monitoring usage, response times, issue resolution rates, and user satisfaction, allowing for real-time adjustments and long-term improvements.
