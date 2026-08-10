from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from lead_management.models import Customer, Project

User = get_user_model()


class AMCType(models.TextChoices):
    COMPREHENSIVE = 'comprehensive', 'Comprehensive'
    NON_COMPREHENSIVE = 'non_comprehensive', 'Non-Comprehensive'


class PaymentFrequency(models.TextChoices):
    ANNUAL = 'annual', 'Annual'
    QUARTERLY = 'quarterly', 'Quarterly'
    MONTHLY = 'monthly', 'Monthly'
    HALF_YEARLY = 'half_yearly', 'Half-Yearly'


class AMCStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    INACTIVE = 'inactive', 'Inactive'
    EXPIRING_SOON = 'expiring_soon', 'Expiring Soon'
    EXPIRED = 'expired', 'Expired'
    SCHEDULED = 'scheduled', 'Scheduled'
    RENEWED = 'renewed', 'Renewed'


class AMCContract(models.Model):
    contract_id = models.CharField(max_length=50, unique=True, blank=True, null=True, verbose_name="Contract ID")
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='amc_contracts',
        verbose_name="Customer"
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='amc_contracts',
        verbose_name="Project"
    )
    product = models.CharField(max_length=255, verbose_name="Product")
    amc_type = models.CharField(
        max_length=50,
        choices=AMCType.choices,
        default=AMCType.COMPREHENSIVE,
        verbose_name="AMC Type"
    )
    # Synced header fields from current active cycle
    start_date = models.DateField(blank=True, null=True, verbose_name="Start Date")
    end_date = models.DateField(blank=True, null=True, verbose_name="End Date")
    annual_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        verbose_name="Annual Value (₹)"
    )
    payment_frequency = models.CharField(
        max_length=50,
        choices=PaymentFrequency.choices,
        default=PaymentFrequency.QUARTERLY,
        verbose_name="Payment Frequency"
    )
    support_coordinator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='coordinated_amcs',
        verbose_name="Support Coordinator"
    )
    scope_of_support = models.TextField(blank=True, null=True, verbose_name="Scope of Support")
    status = models.CharField(
        max_length=50,
        choices=AMCStatus.choices,
        default=AMCStatus.ACTIVE,
        verbose_name="Status"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='amc_contracts_created',
        verbose_name="Created By"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    def generate_contract_id(self):
        last_amc = AMCContract.objects.order_by('-id').first()
        if last_amc and last_amc.contract_id:
            try:
                num = int(last_amc.contract_id.replace("AMC-", "").replace("AMC", ""))
                new_num = num + 1
            except ValueError:
                new_num = 1
        else:
            new_num = 1
        return f"AMC-{new_num:03d}"

    def sync_active_cycle_data(self):
        """Auto-evaluates cycle statuses against today's date and syncs active cycle info to contract header."""
        today = timezone.now().date()
        cycles = list(self.cycles.all().order_by('cycle_number'))
        if not cycles:
            return

        for cycle in cycles:
            if cycle.status == AMCStatus.INACTIVE:
                continue

            c_start = cycle.start_date
            c_end = cycle.end_date

            if c_end and c_end < today:
                if cycle.status != AMCStatus.EXPIRED:
                    cycle.status = AMCStatus.EXPIRED
                    cycle.save(update_fields=['status'])
            elif c_start and c_end and c_start <= today <= c_end:
                new_st = AMCStatus.EXPIRING_SOON if (c_end - today).days <= 30 else AMCStatus.ACTIVE
                if cycle.status != new_st:
                    cycle.status = new_st
                    cycle.save(update_fields=['status'])
            elif c_start and c_start > today:
                if cycle.status != AMCStatus.SCHEDULED:
                    cycle.status = AMCStatus.SCHEDULED
                    cycle.save(update_fields=['status'])

        # Pick active/running cycle or fallback to scheduled / latest
        active_cycle = self.cycles.filter(status__in=[AMCStatus.ACTIVE, AMCStatus.EXPIRING_SOON]).order_by('-cycle_number').first()
        if not active_cycle:
            active_cycle = self.cycles.filter(status=AMCStatus.SCHEDULED).order_by('cycle_number').first() or cycles[-1]

        if active_cycle:
            self.start_date = active_cycle.start_date
            self.end_date = active_cycle.end_date
            self.annual_value = active_cycle.annual_value
            self.payment_frequency = active_cycle.payment_frequency
            
            # If contract has been renewed with 2 or more cycles, mark status as RENEWED
            if len(cycles) > 1 and active_cycle.status != AMCStatus.INACTIVE:
                self.status = AMCStatus.RENEWED
            else:
                self.status = active_cycle.status

            super().save(update_fields=['start_date', 'end_date', 'annual_value', 'payment_frequency', 'status', 'updated_at'])

    def save(self, *args, **kwargs):
        if not self.contract_id:
            self.contract_id = self.generate_contract_id()
        super().save(*args, **kwargs)

    def __str__(self):
        cust_name = getattr(self.customer, 'name', None) or getattr(self.customer, 'company_name', None) or 'No Customer' if self.customer else 'No Customer'
        return f"{self.contract_id or ''} - {cust_name} ({self.product})"

    class Meta:
        ordering = ['-updated_at', '-created_at']
        verbose_name = "AMC Contract"
        verbose_name_plural = "AMC Contracts"


class AMCCycle(models.Model):
    amc_contract = models.ForeignKey(
        AMCContract,
        on_delete=models.CASCADE,
        related_name='cycles',
        verbose_name="AMC Contract"
    )
    cycle_number = models.PositiveIntegerField(default=1, verbose_name="Cycle #")
    start_date = models.DateField(verbose_name="Start Date")
    end_date = models.DateField(verbose_name="End Date")
    annual_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        verbose_name="Annual Value (₹)"
    )
    payment_frequency = models.CharField(
        max_length=50,
        choices=PaymentFrequency.choices,
        default=PaymentFrequency.QUARTERLY,
        verbose_name="Payment Frequency"
    )
    status = models.CharField(
        max_length=50,
        choices=AMCStatus.choices,
        default=AMCStatus.ACTIVE,
        verbose_name="Status"
    )
    remarks = models.TextField(blank=True, null=True, verbose_name="Notes / Remarks")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='amc_cycles_created',
        verbose_name="Created By"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        ordering = ['-cycle_number']
        verbose_name = "AMC Cycle"
        verbose_name_plural = "AMC Cycles"

    def __str__(self):
        return f"{self.amc_contract.contract_id or 'AMC'} - Cycle #{self.cycle_number} ({self.status})"



